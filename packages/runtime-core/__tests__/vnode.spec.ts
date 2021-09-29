import {
	createVNode
} from '../src/vnode'

describe('vnode', () => {
	test('create with just tag', () => {
		const vnode = createVNode('p')
		expect(vnode.type).toBe('p')
		expect(vnode.props).toBe(null)
	})
})
