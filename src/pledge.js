'use strict';
/*----------------------------------------------------------------
Promises Workshop: construye la libreria de ES6 promises, pledge.js
----------------------------------------------------------------*/
function $Promise(executor){
	if(typeof executor !== 'function')throw new TypeError('executor is not a function');

	this._state = 'pending';
	this._value = undefined;
	this._handlerGroups = [];

	executor((data) => this._internalResolve(data),(error) => this._internalReject(error));
	//executor(this._internalResolve.bind(this), this._internalReject.bind(this));
};

$Promise.prototype._internalResolve = function(value){
	if(this._state === 'pending'){
		this._state = 'fulfilled';
		this._value = value;
		this._callHandlers();
	}
};

$Promise.prototype._internalReject = function(value){
	if(this._state === 'pending'){
		this._state = 'rejected';
		this._value = value;
		this._callHandlers();
	}
};

$Promise.prototype._callHandlers = function(){
	while(this._handlerGroups.length > 0){
		let obj = this._handlerGroups.shift();

		if(this._state === 'fulfilled'){
			if(obj.successCb){
				try{
					const result = obj.successCb(this._value);

					if(result instanceof $Promise) result.then(
						(val) => obj.downstreamPromise._internalResolve(val),
						(val) => obj.downstreamPromise._internalReject(val))
					
					else obj.downstreamPromise._internalResolve(result);
				}

				catch(e){
					obj.downstreamPromise._internalReject(e);
				}
			}

			else obj.downstreamPromise._internalResolve(this._value);
		}

		else{
			if(obj.errorCb){
				try{
					const reject = obj.errorCb(this._value);

					if(reject instanceof $Promise) reject.then(
						(val) => obj.downstreamPromise._internalResolve(val),
						(val) => obj.downstreamPromise._internalReject(val))

					else obj.downstreamPromise._internalResolve(reject);
				}
				
				catch(e){
					obj.downstreamPromise._internalReject(e);
				}
			}

			else obj.downstreamPromise._internalReject(this._value);
		}
	}
};

$Promise.prototype.then = function(successCb, errorCb){
	const downstreamPromise = new $Promise(function(){});

	// if(typeof successCb !== 'function') successCb = false;
	// if(typeof errorCb !== 'function') errorCb = false;

	this._handlerGroups.push({
		successCb: typeof successCb === 'function' ? successCb : false, 
		errorCb: typeof errorCb === 'function' ? errorCb : false, 
		downstreamPromise,
	});

	if(this._state !== 'pending') this._callHandlers();

	return downstreamPromise;
};

$Promise.prototype.catch = function(errorCb){
	return this.then(null, errorCb);
};

$Promise.resolve = function(value){
	if(value instanceof $Promise) return value;

	const promise = new $Promise(() => {});

	promise._value = value;
	promise._state = 'fulfilled';

	return promise;
};

$Promise.all = function(arr){
	if(!Array.isArray(arr))throw new TypeError('value is not an array');

	return new $Promise((resolve, reject) => {
		const results = new Array(arr.length);
		const mapped = arr.map($Promise.resolve);
		let remain = arr.length;
		//const mapped = arr.map(value => $Promise.resolve(value));

		mapped.forEach((promise, i) => {
			promise.then(value => {
				results[i] = value;

				if(--remain < 1) resolve(results);
			}, reject);
		});
	});
};

// $Promise.all = function (promises) {
//   if (!Array.isArray(promises)) {
//     throw new TypeError("Algun mensaje");
//   }
//   return new $Promise((resolve, reject) => {
//     const results = new Array(promises.length);
//     let remain = promises.length;
//     const p = promises.map((promise) => $Promise.resolve(promise));
//     p.forEach((promise, i) => {
//       promise.then((value) => {
//         results[i] = value;
//         if (--remain < 1) {
//           resolve(results);
//         }
//       }, reject);
//     });
//   })
// }  

module.exports = $Promise;
/*-------------------------------------------------------
El spec fue diseñado para funcionar con Test'Em, por lo tanto no necesitamos
realmente usar module.exports. Pero aquí está para referencia:

module.exports = $Promise;
es en proyectos Node podemos esribir cosas como estas:
Entonc

var Promise = require('pledge');
…
var promise = new Promise(function (resolve, reject) { … });
--------------------------------------------------------*/
