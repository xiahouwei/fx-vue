import { h, Text, Fragment, render } from "../../node_modules/@fx-vue/vue/dist/vue.esm-bundler.js"

const childrenList1 = Array.from({ length: 3 }, (_, i) => ({ id: i, name: i}))
// const childrenList2 = childrenList1.splice(5, 1)
const childrenList2 = childrenList1.slice(0, 2)
childrenList2.push({ id: 4, name: 4})
console.log(childrenList1)
console.log(childrenList2)

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
	childrenList2.map(item => h('li', { key: item.id }, item.name))
	// childrenList2.map(item => h('li', null, item.name))
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
	childrenList1.map(item => h('li', { key: item.id }, item.name))
	// childrenList1.map(item => h('li', null, item.name))
)
