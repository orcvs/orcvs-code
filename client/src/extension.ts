/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, ExtensionContext, commands, window, StatusBarItem, StatusBarAlignment, ProgressLocation, Progress } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;
let telemeteryStatusBarItem: StatusBarItem;
let frameStatusBarItem: StatusBarItem;

export async function activate(context: ExtensionContext) {


	// The server is implemented in node
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
		}
	};

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'plaintext' }, { scheme: 'file', pattern: '**​/*.orcvs*' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		},
		outputChannelName: 'Orcvs Language Server',
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'OrcvsLanguageServer',
		'Orcvs Language Server',
		serverOptions,
		clientOptions
	);

	activateCommands(client, context);

	telemeteryStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100);
	frameStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100);

	updateTelemetryStatusBarItem();

	client.start();

	await client.onReady();
	client.onNotification('orcvs.telemetry', showTelemetry);
	client.onNotification('orcvs.message', showMessage);
	client.onNotification('orcvs.frame', showFrameCount);
}

function showTelemetry({ average, percentile }: { average: string, percentile: string }) {
	// console.log('orcvs.telemetry');
	// logger.info({ tick: `${average}ms Average` });
	updateTelemetryStatusBarItem(`Tick: ${percentile}ms`);
}

// function message(msg: string) {
// 	// updateTelemetryStatusBarItem(msg);
// 	window.showInformationMessage(`${orcvs} ${msg}`);
// }

// function activateCommands(client: LanguageClient, context: ExtensionContext) {
// 	const disposable = commands.registerCommand('orcvscode.helloWorld', () => {
// 		console.log('orcvscode.helloWorld');
// 		// const activeTextEditor = window.activeTextEditor;
// 		// console.log(activeTextEditor);
// 		const document = window.activeTextEditor.document;
// 		console.log(document.fileName);

// 		client.sendNotification('orcvs.run', { filename: document.fileName });
// 		window.showInformationMessage('Hello World from orcvscode!');
// 	});
// 	context.subscriptions.push(disposable);
// }

type CommandHandler = (...args: any[]) => void

const orcvs = 'O̴̫͉͌r̸̘͉̫̣̐̈́͊c̶̛̪̖̻͔̈́̃̓v̷̨͎̿͝ŝ̷̩͑̾';

function play() {
		// const activeTextEditor = window.activeTextEditor;
		// console.log(activeTextEditor);
		const document = window.activeTextEditor.document;

		console.info('orcvs.play', document.fileName);

		client.sendNotification('orcvs.play', { filename: document.fileName });
		// window.showInformationMessage(`${orcvs} Play`);

		showMessage('Play');
}

// await showMessage(progress, 'Play');
// async function showMessage(progress: Progress<{message: string, increment: number}>, message: string, increment = 1) {
// 	console.log({increment});
// 	if (increment < 5) {
// 		progress.report({ increment: increment * 20, message});
// 		setTimeout(() => {
// 			showMessage(progress, message, increment + 1);
// 		}, 1000);
// 	}
// }

async function showMessage(msg: string) {
	window.withProgress(
		{
			location: ProgressLocation.Notification,
			title: `${orcvs} ${msg}`,
			cancellable: false,
		},
		async (progress, token) => {
			progress.report({ increment: 99 });
			await new Promise( (r) => setTimeout(r, 2500));
		}
	);
}

function pause() {
	console.info('orcvs.pause');
	client.sendNotification('orcvs.pause');
	// window.showInformationMessage(`${orcvs} Pause`);
	showMessage('Pause');
}

function stop() {
	console.info('orcvs.stop');
	client.sendNotification('orcvs.stop');
	// window.showInformationMessage(`${orcvs} Stop`);
	showMessage('Stop');
}

function reset() {
	console.info('orcvs.reset');
	client.sendNotification('orcvs.reset');
	// window.showInformationMessage(`${orcvs} Reset`);
	showMessage('Reset');
}

function tick() {
	console.info('orcvs.tick');
	client.sendNotification('orcvs.tick');
	// window.showInformationMessage(`${orcvs} Tick`);
	// showMessage('Tick');
}

let bpm = 120;

async function setBPM() {
	console.info('orcvs.setBpm');
	bpm = await showInputBox();
	client.sendNotification('orcvs.setBpm');
	// window.showInformationMessage(`${orcvs} Set BPM ${bpm}`);
	showMessage(`Set BPM ${bpm}`);
}

export async function showInputBox() {
	const result = await window.showInputBox({
		value: bpm.toString(),
		validateInput: (text) => {
			const bpm = parseInt(text);
			const inRange = bpm >= 60 && bpm <= 220;
			return inRange? null : 'BPM should be between 60-220';
		}
	});
	return parseInt(result);
}

const orcvsCommands:{ [name: string]: CommandHandler} = {
	'orcvs.play': play,
	'orcvs.pause': pause,
	'orcvs.stop': stop,
	'orcvs.reset': reset,
	'orcvs.tick': tick,
	'orcvs.setBpm': setBPM,
};

function activateCommands(client: LanguageClient, context: ExtensionContext) {

	for (const [command, handler] of Object.entries(orcvsCommands)) {
		const disposable = commands.registerCommand(command, handler);
		context.subscriptions.push(disposable);
	}
}

function updateTelemetryStatusBarItem(msg = orcvs): void {
	telemeteryStatusBarItem.text = msg;
	telemeteryStatusBarItem.show();
}

function updateFrameStatusBarItem(frame = 0): void {
	frameStatusBarItem.text = `BPM ${bpm} / Frame ${frame}`;
	frameStatusBarItem.show();
}

let _incrementing = false;
let _frame = 0;

function showFrameCount(frame): void {
	_frame = frame;
	updateFrameStatusBarItem(frame);

	if (!_incrementing) {
		incrementFrameCount();
		_incrementing = true;
	}
}

function incrementFrameCount() {
	updateFrameStatusBarItem(_frame + 1);
	setTimeout(incrementFrameCount, msPerBeat());
}

const MINUTE = 60000;
const FRAMES_PER_BEAT = 4;

export function msPerBeat() {
  return ( MINUTE  / bpm) / FRAMES_PER_BEAT;
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
