const messageDictionary = {
    de: {
        'autoUpdate.available.title': 'Update verfügbar',
        'autoUpdate.available.message.1': 'Eine neue Version von iDAI.field (',
        'autoUpdate.available.message.2': ') ist verfügbar. Möchten Sie sie herunterladen und installieren?',
        'autoUpdate.available.yes': 'Ja',
        'autoUpdate.available.no': 'Nein',
        'autoUpdate.downloaded.title': 'Update installieren',
        'autoUpdate.downloaded.message.1': 'Version ',
        'autoUpdate.downloaded.message.2': ' von iDAI.field wurde geladen. Starten Sie die Anwendung neu, ' +
            'um sie zu installieren.',
        'menu.about': 'Über iDAI.field',
        'menu.settings': 'Einstellungen',
        'menu.file': 'Datei',
        'menu.file.newProject': 'Neues Projekt',
        'menu.file.openProject': 'Projekt öffnen',
        'menu.file.syncProject': 'Projekt synchronisieren',
        'menu.file.import': 'Import',
        'menu.file.export': 'Export',
        'menu.file.exit': 'Beenden',
        'menu.edit': 'Bearbeiten',
        'menu.edit.undo': 'Rückgängig',
        'menu.edit.redo': 'Wiederherstellen',
        'menu.edit.cut': 'Ausschneiden',
        'menu.edit.copy': 'Kopieren',
        'menu.edit.paste': 'Einfügen',
        'menu.edit.selectAll': 'Alles auswählen',
        'menu.tools': 'Werkzeuge',
        'menu.tools.images': 'Bilderverwaltung',
        'menu.tools.types': 'Typenverwaltung',
        'menu.tools.matrix': 'Matrix',
        'menu.tools.backupCreation': 'Backup erstellen',
        'menu.tools.backupLoading': 'Backup einlesen',
        'menu.view': 'Anzeige',
        'menu.view.reload': 'Neu laden',
        'menu.view.toggleFullscreen': 'Vollbild an/aus',
        'menu.view.toggleDeveloperTools': 'Entwicklertools an/aus',
        'menu.window': 'Fenster',
        'menu.window.minimize': 'Minimieren',
        'menu.help': 'Hilfe',
        'menu.help.configuration': 'Formularkonfiguration',
    },
    en: {
        'autoUpdate.available.title': 'Update available',
        'autoUpdate.available.message.1': 'A new version of iDAI.field (',
        'autoUpdate.available.message.2': ') is available. Do you want to download and install it?',
        'autoUpdate.available.yes': ' Yes ',
        'autoUpdate.available.no': ' No ',
        'autoUpdate.downloaded.title': 'Install update',
        'autoUpdate.downloaded.message.1': 'Version ',
        'autoUpdate.downloaded.message.2': ' of iDAI.field has been downloaded. Please restart the ' +
            'application to install it.',
        'menu.about': 'About iDAI.field',
        'menu.settings': 'Settings',
        'menu.file': 'File',
        'menu.file.newProject': 'New project',
        'menu.file.openProject': 'Open project',
        'menu.file.syncProject': 'Sync project',
        'menu.file.import': 'Import',
        'menu.file.export': 'Export',
        'menu.file.exit': 'Exit',
        'menu.edit': 'Edit',
        'menu.edit.undo': 'Undo',
        'menu.edit.redo': 'Redo',
        'menu.edit.cut': 'Cut',
        'menu.edit.copy': 'Copy',
        'menu.edit.paste': 'Paste',
        'menu.edit.selectAll': 'Select all',
        'menu.tools': 'Tools',
        'menu.tools.images': 'Image management',
        'menu.tools.types': 'Type management',
        'menu.tools.matrix': 'Matrix',
        'menu.tools.backupCreation': 'Create backup',
        'menu.tools.backupLoading': 'Restore backup',
        'menu.view': 'View',
        'menu.view.reload': 'Reload',
        'menu.view.toggleFullscreen': 'Fullscreen on/off',
        'menu.view.toggleDeveloperTools': 'Developer tools on/off',
        'menu.window': 'Window',
        'menu.window.minimize': 'Minimize',
        'menu.help': 'Help',
        'menu.help.configuration': 'Form configuration'
    },
    it: {
        'autoUpdate.available.title': 'Update disponibile',
        'autoUpdate.available.message.1': 'Una nuova versione di iDAI.field (',
        'autoUpdate.available.message.2': ') è disponibile. Si desidera scaricarla e installarla?',
        'autoUpdate.available.yes': 'Sì',
        'autoUpdate.available.no': 'No',
        'autoUpdate.downloaded.title': 'Installa aggiornamento',
        'autoUpdate.downloaded.message.1': 'La versione ',
        'autoUpdate.downloaded.message.2': ' di iDAI.field è stata scaricata. Riavviare l’applicazione, '
            + 'per installarla.',
        'menu.about': 'Informazioni su iDAI.field',
        'menu.settings': 'Impostazioni',
        'menu.file': 'File',
        'menu.file.newProject': 'Neues Projekt',
        'menu.file.openProject': 'Projekt öffnen',
        'menu.file.syncProject': 'Projekt synchronisieren',
        'menu.file.import': 'Importa',
        'menu.file.export': 'Esporta',
        'menu.file.exit': 'Esci',
        'menu.edit': 'Modifica',
        'menu.edit.undo': 'Annulla',
        'menu.edit.redo': 'Ripristina',
        'menu.edit.cut': 'Taglia',
        'menu.edit.copy': 'Copia',
        'menu.edit.paste': 'Incolla',
        'menu.edit.selectAll': 'Seleziona tutto',
        'menu.tools': 'Strumenti',
        'menu.tools.images': 'Gestione immagini',
        'menu.tools.types': 'Gestione tipi',
        'menu.tools.matrix': 'Matrix',
        'menu.tools.backupCreation': 'Crea Backup',
        'menu.tools.backupLoading': 'Carica Backup',
        'menu.view': 'Mostra',
        'menu.view.reload': 'Aggiorna',
        'menu.view.toggleFullscreen': 'Schermo intero on/off',
        'menu.view.toggleDeveloperTools': 'Strumenti per sviluppatori on/off',
        'menu.window': 'Finestra',
        'menu.window.minimize': 'Riduci',
        'menu.help': 'Aiuto',
        'menu.help.configuration': 'Configurazione formulario',
    }
};


const get = (identifier) => messageDictionary[global.getLocale()][identifier];


module.exports = {
    get: get
};
