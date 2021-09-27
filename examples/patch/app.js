import { h, Text, Fragment, render } from "../../node_modules/@fx-vue/vue/dist/vue.esm-bundler.js"

const app2 = h(
	"div",
	{
		class: 'c',
		style: {
			border: '1px solid',
			fontSize: '14px'
		},
		onClick: () => console.log('click2'),
		id: 'foo2',
		checked: '',
		customer: false
	},
	[
		h('div', null, '2222222')
	]
)

export default h(
	"div",
	{
		class: 'a b',
		style: {
			border: '1px solid',
			fontSize: '14px'
		},
		onClick: () => {
			render(app2, document.querySelector('#root'))
		},
		id: 'foo1',
		checked: '',
		customer: false
	},
	[
		h('div', null, '11111111')
	]
);
