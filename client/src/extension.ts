/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { clear } from 'console';
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

let _bpm = 120;

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
	client.onNotification('orcvs.clock', syncClock);
}

function showTelemetry({ average, percentile }: { average: string, percentile: string }) {
	console.log('orcvs.telemetry');
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

function restart() {
	console.info('orcvs.reset');
	client.sendNotification('orcvs.restart');
	// window.showInformationMessage(`${orcvs} Reset`);
	showMessage('Restart');
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

async function setBPM() {
	console.info('orcvs.setBpm');
	_bpm = await showInputBox();
	client.sendNotification('orcvs.setBpm');
	// window.showInformationMessage(`${orcvs} Set BPM ${bpm}`);
	showMessage(`Set BPM ${_bpm}`);
}

export async function showInputBox() {
	const result = await window.showInputBox({
		value: _bpm.toString(),
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
	'orcvs.restart': restart,
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

function updateFrameStatusBarItem(frame: number): void {
	frameStatusBarItem.text = `BPM ${_bpm} / Frame ${frame}`;
	frameStatusBarItem.show();
}

function syncClock({ frame = 0, bpm }: { frame: number, bpm: number }) {
	if (bpm !== _bpm) {
		_bpm = bpm;
	}
	updateFrameStatusBarItem(frame);
}
const MINUTE = 60000;
const FRAMES_PER_BEAT = 4;

export function msPerBeat() {
  return ( MINUTE  / _bpm) / FRAMES_PER_BEAT;
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
