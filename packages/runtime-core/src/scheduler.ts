// 任务队列
const queue = []
// 正在执行任务
let isFlushing = false

// resolve
const resolvedPromise = Promise.resolve()
// 当前正在执行的任务
let currentFlushPromise = null

export function nextTick (fn) {
	// 如果当前正在执行任务, 则等任务执行成功后再执行fn, 否则微任务执行后执行
	const p = currentFlushPromise || resolvedPromise
 	return fn ? p.then(fn) : p
}

export function queueJob(job) {
	if (!queue.length || !queue.includes(job)) {
		queue.push(job)
		// 执行所有的 job
		queueFlush()
	}
}

// 执行所有job, 多次调用只执行一次
function queueFlush () {
	if (!isFlushing) {
		isFlushing = true
		// 如果有正在执行的任务, 则设置currentFlushPromise, 用于nextTick使用
		currentFlushPromise = resolvedPromise.then(flushJobs)
	}
}

function flushJobs () {
	// 避免用户的逻辑出现问题, 进行try
	try {
		for (let i = 0; i < queue.length; i++) {
			const job = queue[i]
			job()
		}
	} finally {
		// 任务执行完 把状态重置
		isFlushing = false
		queue.length = 0
		currentFlushPromise = null
	}
}