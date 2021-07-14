import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { copy, flow, forEach, isEmpty, map, remove, take } from 'tsfun';
import { Category, Document, Datastore, IdGenerator, SyncService, ProjectConfiguration,
    RelationsManager, ProjectCategories } from 'idai-field-core';
import { AngularUtility } from '../../angular/angular-utility';
import { ExportRunner } from '../../core/export/export-runner';
import { Imagestore } from '../../core/images/imagestore/imagestore';
import { Importer, ImporterFormat, ImporterOptions, ImporterReport } from '../../core/import/importer';
import { JavaToolExecutor } from '../../core/java/java-tool-executor';
import { ImageRelationsManager } from '../../core/model/image-relations-manager';
import { SettingsProvider } from '../../core/settings/settings-provider';
import { TabManager } from '../../core/tabs/tab-manager';
import { ExtensionUtil } from '../../core/util/extension-util';
import { MenuContext } from '../services/menu-context';
import { Menus } from '../services/menus';
import { M } from '../messages/m';
import { Messages } from '../messages/messages';
import { ImportState } from './import-state';
import { MessagesConversion } from './messages-conversion';
import { UploadModalComponent } from './upload-modal.component';
import BASE_EXCLUSION = ExportRunner.BASE_EXCLUSION;
import getCategoriesWithoutExcludedCategories = ExportRunner.getCategoriesWithoutExcludedCategories;
import {Labels} from '../services/labels';


@Component({
    templateUrl: './import.html',
    host: {
        '(window:keydown)': 'onKeyDown($event)'
    }
})
/**
 * Delegates calls to the Importer, waits for
 * the import to finish and extracts the importReport
 * in order to generate appropriate messages to display
 * to the user.
 *
 * @author Thomas Kleinke
 * @author Daniel de Oliveira
 */
export class ImportComponent implements OnInit {

    public operations: Array<Document> = [];
    public javaInstalled: boolean = true;
    public running: boolean = false;
    public ignoredIdentifiers: string[] = [];

    public readonly allowedFileExtensions: string = '.csv, .jsonl, .geojson, .json, .shp, .catalog';
    public readonly allowedHttpFileExtensions: string = '.csv, .jsonl, .geojson, .json';


    constructor(public importState: ImportState,
                private messages: Messages,
                private datastore: Datastore,
                private relationsManager: RelationsManager,
                private imageRelationsManager: ImageRelationsManager,
                private imagestore: Imagestore,
                private http: HttpClient,
                private settingsProvider: SettingsProvider,
                private projectConfiguration: ProjectConfiguration,
                private modalService: NgbModal,
                private synchronizationService: SyncService,
                private idGenerator: IdGenerator,
                private tabManager: TabManager,
                private menuService: Menus,
                private labels: Labels) {

        this.resetOperationIfNecessary();
    }


    public getDocumentLabel = (document: any) => Document.getLabel(document);

    public getCategoryLabel = (category: Category) => this.labels.get(category);

    public isJavaInstallationMissing = () => this.importState.format === 'shapefile' && !this.javaInstalled;

    public isDefaultFormat = () => Importer.isDefault(this.importState.format);

    public isMergeMode = () => this.importState.mergeMode;

    public shouldDisplayPermitDeletionsOption = () => this.isDefaultFormat() && this.importState.mergeMode === true;

    public shouldDisplayImportIntoOperation = () => Importer.importIntoOperationAvailable(this.importState);

    public getSeparator = () => this.importState.separator;

    public setSeparator = (separator: string) => this.importState.setSeparator(separator);

    public getAllowedFileExtensions = () => this.importState.sourceType === 'file'
        ? this.allowedFileExtensions
        : this.allowedHttpFileExtensions;


    async ngOnInit() {

        this.operations = await this.fetchOperations();
        this.updateCategories();
        this.javaInstalled = await JavaToolExecutor.isJavaInstalled();
    }


    public async onKeyDown(event: KeyboardEvent) {

        if (event.key === 'Escape' && this.menuService.getContext() === MenuContext.DEFAULT) {
            await this.tabManager.openActiveTab();
        }
    }


    public async onImportButtonClick() {

        if (!this.isReady()) return;

        this.running = true;
        await AngularUtility.refresh(100);
        await this.startImport();

        // The timeout is necessary to prevent another import from starting if the import button is clicked
        // again while the import is running
        setTimeout(() => this.running = false, 100);
    }


    public isReady(): boolean|undefined {

        return !this.running
            && this.ignoredIdentifiers.length < 2
            && this.importState.format !== undefined
            && (this.importState.format !== 'shapefile' || !this.isJavaInstallationMissing())
            && (this.importState.sourceType === 'file'
                ? this.importState.file !== undefined
                : this.importState.url !== undefined);
    }


    public reset(): void {

        this.messages.removeAllMessages();
        this.importState.file = undefined;
        this.importState.format = undefined;
        this.importState.url = undefined;
        this.importState.mergeMode = false;
        this.importState.permitDeletions = false;
    }


    public selectFile(event: any) {

        this.reset();

        this.importState.typeFromFileName = false;

        const files = event.target.files;
        this.importState.file = !files || files.length === 0
            ? undefined
            : files[0];

        if (this.importState.file) {
            this.updateFormat();
            if (!this.importState.format) {
                this.messages.add([M.IMPORT_ERROR_INVALID_FILE_FORMAT, this.allowedFileExtensions]);
                return;
            }

            this.importState.selectedCategory = this.getCategoryFromFileName(this.importState.file.name);
            if (this.importState.selectedCategory) {
                this.importState.typeFromFileName = true;
            } else {
                this.selectFirstCategory();
            }
        }
    }


    public setMergeMode(mergeImport: boolean) {

        this.importState.mergeMode = mergeImport;
        this.importState.permitDeletions = false;
        this.updateCategories();
    }


    public updateFormat() {

        this.importState.format = ImportComponent.getImportFormat(
            this.importState.file
                ? this.importState.file.name
                : this.importState.url
        );
    }


    public updateCategories() {

        this.importState.categories = getCategoriesWithoutExcludedCategories(
            this.projectConfiguration.getCategoriesArray(), this.getCategoriesToExclude()
        );

        if (!this.importState.selectedCategory || !this.importState.categories.includes(this.importState.selectedCategory)) {
            this.selectFirstCategory();
        }
    }


    private async resetOperationIfNecessary() {

        if (!this.importState.selectedOperationId) return;

        try {
            await this.datastore.get(this.importState.selectedOperationId);
        } catch {
            this.importState.selectedOperationId = '';
        }
    }


    private async startImport() {

        this.messages.removeAllMessages();

        this.menuService.setContext(MenuContext.MODAL);
        const uploadModalRef: any = this.modalService.open(
            UploadModalComponent,
            { backdrop: 'static', keyboard: false }
        );

        await AngularUtility.refresh();

        this.synchronizationService.stopSync();

        let importReport: ImporterReport;
        try {
             importReport = await this.doImport();
        } catch (errWithParams) {
            this.messages.add(MessagesConversion.convertMessage(errWithParams));
        }
        await this.synchronizationService.startSync();

        uploadModalRef.close();
        this.menuService.setContext(MenuContext.DEFAULT);

        if (importReport) this.showImportResult(importReport);
    }


    private getCategoriesToExclude() {

        return this.importState.mergeMode
            ? BASE_EXCLUSION
            : BASE_EXCLUSION.concat(ProjectCategories.getImageCategoryNames(this.projectConfiguration.getCategoryForest()));
    }


    private async doImport() {

        const options = copy(this.importState as any) as unknown as ImporterOptions;
        if (options.mergeMode === true) options.selectedOperationId = '';

        const fileContents = await Importer.doRead(
            this.http,
            this.settingsProvider.getSettings(),
            options
        )
        const documents = await Importer.doParse(
            options,
            fileContents);

        return Importer.doImport(
            {
                datastore: this.datastore,
                relationsManager: this.relationsManager,
                imageRelationsManager: this.imageRelationsManager,
                imagestore: this.imagestore
            },
            {
                settings: this.settingsProvider.getSettings(),
                projectConfiguration: this.projectConfiguration
            },
            () => this.idGenerator.generateId(),
            options,
            documents);
    }


    private showImportResult(importReport: ImporterReport) {

        if (importReport.errors.length > 0) {
            return this.showMessages(importReport.errors);
        }  else if (importReport.successfulImports === 0 && importReport.ignoredIdentifiers.length === 0) {
            this.showEmptyImportWarning();
        } else {
            this.showSuccessMessage(importReport.successfulImports);
        }

        this.ignoredIdentifiers = importReport.ignoredIdentifiers;
        if (this.ignoredIdentifiers.length > 0) this.showIgnoredIdentifiersWarning(this.ignoredIdentifiers);
    }


    private showEmptyImportWarning() {

        this.messages.add([M.IMPORT_WARNING_EMPTY]);
    }


    private showIgnoredIdentifiersWarning(ignoredIdentifiers: string[]) {

        this.messages.add([
            (this.importState.mergeMode || ['geojson', 'shapefile'].includes(this.importState.format))
                ? ignoredIdentifiers.length === 1
                    ? M.IMPORT_WARNING_IGNORED_MISSING_IDENTIFIER
                    : M.IMPORT_WARNING_IGNORED_MISSING_IDENTIFIERS
                : ignoredIdentifiers.length === 1
                    ? M.IMPORT_WARNING_IGNORED_EXISTING_IDENTIFIER
                    : M.IMPORT_WARNING_IGNORED_EXISTING_IDENTIFIERS,
            ignoredIdentifiers.length === 1
                ? ignoredIdentifiers[0]
                : ignoredIdentifiers.length.toString()
        ]);
    }


    private showSuccessMessage(successfulImports: number) {

        if (successfulImports === 1) {
            this.messages.add([M.IMPORT_SUCCESS_SINGLE]);
        } else if (successfulImports > 1) {
            this.messages.add([M.IMPORT_SUCCESS_MULTIPLE, successfulImports.toString()]);
        }
    }


    private showMessages(messages: string[][]) {

        flow(messages,
            map(MessagesConversion.convertMessage),
            remove(isEmpty),
            take(1),
            forEach((msgWithParams: any) => this.messages.add(msgWithParams)));
    }


    private async fetchOperations(): Promise<Array<Document>> {

        try {
            return (await this.datastore.find({
                categories: ProjectCategories.getOperationCategoryNames(this.projectConfiguration.getCategoryForest())
            })).documents;
        } catch (msgWithParams) {
            this.messages.add(msgWithParams);
            return [];
        }
    }


    private getCategoryFromFileName(fileName: string): Category|undefined {

        for (let segment of fileName.split('.')) {
            const category: Category|undefined = this.projectConfiguration.getCategoriesArray()
                .find(category => category.name.toLowerCase() === segment.toLowerCase());
            if (category) return category;
        }

        return undefined;
    }


    private selectFirstCategory() {

        if (this.importState.categories.length > 0) this.importState.selectedCategory = this.importState.categories[0];
    }


    private static getImportFormat(fileName: string): ImporterFormat|undefined {

        switch(ExtensionUtil.getExtension(fileName)) {
            case 'catalog':
                return 'catalog';
            case 'jsonl':
                return 'native';
            case 'geojson':
            case 'json':
                return 'geojson';
            case 'shp':
                return 'shapefile';
            case 'csv':
                return 'csv';
            default:
                return undefined;
        }
    }
}
