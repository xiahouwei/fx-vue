import { h, Text, Fragment } from "../../node_modules/@fx-vue/vue/dist/vue.esm-bundler.js"

export default {
	name: "App",
	setup() { },

	render() {
		return h(
			"div",
			{
				class: 'a b',
				style: {
					border: '1px solid',
					fontSize: '14px'
				},
				onClick: () => console.log('click'),
				id: 'foo',
				checked: '',
				customer: false
			},
			[
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
				])
			]
		);
	}
}
