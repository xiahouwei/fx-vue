import { h, Text, Fragment, render } from "../../node_modules/@fx-vue/vue/dist/vue.esm-bundler.js"

const app2 = h(
	"ul",
	{
		class: 'c',
		style: {
			border: '1px solid blue',
			fontSize: '24px'
		},
		onClick: () => console.log('click2'),
		id: 'foo2',
		checked: '',
		customer: false
	},
	[
		h('li', {
			key: '3'
		}, '3'),
		h('li', {
			key: '1'
		}, '1'),
		h('li', {
			key: '2'
		}, '2')
	]
)

export default h(
	"ul",
	{
		class: 'a b',
		style: {
			border: '1px solid red',
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
		h('li', {
			key: '1'
		}, '1'),
		h('li', {
			key: '2'
		}, '2'),
		h('li', {
			key: '3'
		}, '3')
	]

)
