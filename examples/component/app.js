import { h, Text, Fragment, ref, nextTick } from "../../node_modules/@fx-vue/vue/dist/vue.esm-bundler.js"

export default {
	name: "App",
	setup() {
		const count = ref(0)
		const add = () => {
			count.value++
			count.value++
			count.value++
			count.value++
			// debugger
			nextTick(() => {
				debugger
			})
			console.log(count.value)
		}
		return {
			count,
			add
		}
	},

	render(ctx) {
		console.log('render')
		return h(
			"div",
			{
				class: 'a b',
				style: {
					border: '1px solid',
					fontSize: '14px'
				},
				id: 'foo',
				checked: '',
				customer: false
			},
			[
				h('div', null, ctx.count),
				h('ul', null, [
					h('li', { style: { color: 'red' } }, 1),
					h('li', null, 2),
					h('li', { style: { color: 'blue' } }, 3),
					h(Fragment, null, [
						h('li', null, 4),
						h('li')
					]),
					h('li', null, [
						h(Text, null, 'hello world'),
					])
				]),
				h('div', {
					onClick: ctx.add,
				}, '点我'),
			]
		)
	}
}
