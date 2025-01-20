import { log, error } from '../modules/Logger';

if (window.Worker) {
} else {
    error('Your browser doesn\'t support web workers.');
}

export var worker = new Worker("./services/worker/SQLiteWorker.js", { type: 'module' });
worker.onmessage = function (event) {
    var data = event.data;

    switch (data.type) {
        case "application/x-sqlite3": // db download ready
            const downloadChannel = new BroadcastChannel("download_channel");
            downloadChannel.postMessage(data);
            downloadChannel.close();
            break;
        case "application/json":
            returnValue[data.timestamp] = structuredClone(data.result);
            break;
        default:
            log("response from worker:", data);
    }
};

let returnValue = {};

function getWorker() {
    return new Promise((resolve) => {
        const checkAgain = function () {
            if (worker) {
                resolve(worker);
            } else
                setTimeout(checkAgain, 0);
        }
        checkAgain();
    });
}

export async function executeQuery({ text, values }) {
    var queryString = text;
    if (values && queryString.indexOf("$") != -1) values.forEach(function replacePlaceholder(item, index) { queryString = queryString.replace("$" + (index + 1), `'${item}'`); });
    const worker = await getWorker();
    var timestamp = Date.now();
    worker.postMessage({ timestamp, type: "exec", sql: queryString, returnValue: "resultRows" });

    return new Promise((resolve) => {
        const checkAgain = function () {
            if (returnValue[timestamp]) {
                const retVal = structuredClone(returnValue[timestamp]);
                resolve(retVal);
            } else
                setTimeout(checkAgain, 0);
        }
        checkAgain();
    });
}

export async function executeQuerySync({ text, values }) {
    var queryString = text;
    if (values && queryString.indexOf("$") === -1) values.forEach(function replacePlaceholder(item, index) { queryString = queryString.replace("$" + (index + 1), `'${item}'`); });
    const message = { type: "exec", sql: queryString, returnValue: "resultRows" };
    const worker = await getWorker();
    worker.postMessage(JSON.stringify(message));
}

export function uploadSync(arrayBuffer) {
    worker.postMessage({ "type": "upload", "buffer": arrayBuffer });
}

export function downloadSync() {
    worker.postMessage({ "type": "download" });
}
