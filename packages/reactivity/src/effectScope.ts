
let activeEffectScope
const effectScopeStack = []

export class EffectScope {
	active = true
	effects = []
	cleanups = []

	parent: EffectScope | undefined
	scopes: EffectScope[] | undefined
	/**
	 * track a child scope's index in its parent's scopes array for optimized
	 * removal
	 */
	private index: number | undefined

	constructor(detached = false) {
		if (!detached && activeEffectScope) {
			this.parent = activeEffectScope
			this.index =
				(activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(
					this
				) - 1
		}
	}

	run(fn) {
		if (this.active) {
			try {
				this.on()
				return fn()
			} finally {
				this.off()
			}
		}
	}

	on() {
		if (this.active) {
			effectScopeStack.push(this)
			activeEffectScope = this
		}
	}

	off() {
		if (this.active) {
			effectScopeStack.pop()
			activeEffectScope = effectScopeStack[effectScopeStack.length - 1]
		}
	}

	stop(fromParent?: boolean) {
		if (this.active) {
			this.effects.forEach(e => e.stop())
			this.cleanups.forEach(cleanup => cleanup())
			if (this.scopes) {
				this.scopes.forEach(e => e.stop(true))
			}
			// nested scope, dereference from parent to avoid memory leaks
			if (this.parent && !fromParent) {
				// optimized O(1) removal
				const last = this.parent.scopes!.pop()
				if (last && last !== this) {
					this.parent.scopes![this.index!] = last
					last.index = this.index!
				}
			}
			this.active = false
		}
	}
}

export function effectScope(detached?: boolean) {
	return new EffectScope(detached)
}

export function recordEffectScope(
	effect,
	scope?: EffectScope | null
) {
	scope = scope || activeEffectScope
	if (scope && scope.active) {
		scope.effects.push(effect)
	}
}

export function getCurrentScope() {
	return activeEffectScope
}

export function onScopeDispose(fn: () => void) {
	if (activeEffectScope) {
		activeEffectScope.cleanups.push(fn)
	}
}
