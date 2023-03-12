/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import {
	Orcvs,
} from 'Orcvs';

const ORCVS = 'O̴̫͉͌r̸̘͉̫̣̐̈́͊c̶̛̪̖̻͔̈́̃̓v̷̨͎̿͝ŝ̷̩͑̾';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

const orcvs = Orcvs();

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

interface Settings {
	telemetryTimeout: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: Settings = { telemetryTimeout: 20000 };
let globalSettings: Settings = defaultSettings;

connection.onDidChangeConfiguration(change => {
	globalSettings = <Settings>(
		(change.settings.languageServerExample || defaultSettings)
	);
});

connection.onInitialized( async () => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}

	await initOrcvs();
});

async function initOrcvs() {
	console.info('Server.Orcvs', 'init');
	await orcvs.setup();
	await orcvs.setOutput('LoopMidi');
	sendMessage('Output: LoopMidi');
}

connection.onNotification('orcvs.play', async ({ filename })=>{
	console.info('Server.Orcvs', 'play', filename);
	await orcvs.play(filename);
	sendMessage('Playing');
	setTimeout(telemetry, globalSettings.telemetryTimeout);
	setTimeout(frame, 1000);

});

async function telemetry() {
	const { average, percentile } = await orcvs.telemetry();
	connection.sendNotification("orcvs.telemetry", { average, percentile });
	setTimeout(telemetry, globalSettings.telemetryTimeout);
}

async function frame() {
	const f = orcvs.frame();
	connection.sendNotification("orcvs.frame", f);
	setTimeout(frame, 500);
}

async function sendMessage(msg: string) {
	connection.sendNotification("orcvs.message", msg);
}

connection.onNotification('orcvs.pause', async () => {
	console.info('Server.Orcvs', 'pause');
	await orcvs.stop();
});

connection.onNotification('orcvs.stop', async () => {
	console.info('Server.Orcvs', 'stop');
	await orcvs.stop();
	await orcvs.reset();
});

connection.onNotification('orcvs.reset', async()=>{
	console.info('Server.Orcvs', 'reset');
	await  orcvs.reset();
});

connection.onNotification('orcvs.touch', async()=>{
	console.info('Server.Orcvs', 'touch');
	await orcvs.touch();
});

connection.onNotification('orcvs.setBPM', async ({ bpm }) => {
	console.info('Server.Orcvs', 'setBPM');
	await orcvs.bpm(bpm);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	// connection.console.log('orcvs.onDidChangeContent');
	// console.log('orcvs.onDidChangeContent');
	// validateTextDocument(change.document);
});

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
	console.log(_change);
});

// // This handler provides the initial list of the completion items.
// connection.onCompletion(
// 	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
// 		// The pass parameter contains the position of the text document in
// 		// which code complete got requested. For the example we ignore this
// 		// info and always provide the same completion items.
// 		return [
// 			{
// 				label: 'Zaphod',
// 				kind: CompletionItemKind.Text,
// 				data: 1
// 			},
// 			{
// 				label: 'JavaScript',
// 				kind: CompletionItemKind.Text,
// 				data: 2
// 			}
// 		];
// 	}
// );

// // This handler resolves additional information for the item selected in
// // the completion list.
// connection.onCompletionResolve(
// 	(item: CompletionItem): CompletionItem => {
// 		if (item.data === 1) {
// 			item.detail = 'Zaphod details';
// 			item.documentation = 'Zaphod documentation';
// 		} else if (item.data === 2) {
// 			item.detail = 'JavaScript details';
// 			item.documentation = 'JavaScript documentation';
// 		}
// 		return item;
// 	}
// );

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
