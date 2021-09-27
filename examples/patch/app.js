import { h, Text, Fragment, render } from "../../node_modules/@fx-vue/vue/dist/vue.esm-bundler.js"

const app2 = h(
	"span",
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
	'2222222'
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
		h('span', null, 1111111),
		h('span', null, 3333333),
		h('span', null, 4444444),
	]
);
