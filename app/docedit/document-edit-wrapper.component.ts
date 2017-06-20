import {Component, EventEmitter, Input, Output} from '@angular/core';
import {DocumentEditChangeMonitor} from 'idai-components-2/documents';
import {Messages} from 'idai-components-2/messages';
import {DatastoreErrors} from 'idai-components-2/datastore';
import {ConfigLoader, ProjectConfiguration, RelationDefinition} from 'idai-components-2/configuration';
import {PersistenceManager, Validator} from 'idai-components-2/persist';
import {IdaiFieldDocument} from 'idai-components-2/idai-field-model';
import {M} from '../m';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {ConflictDeletedModalComponent} from './conflict-deleted-modal.component';
import {ConflictModalComponent} from './conflict-modal.component';
import {IdaiFieldDatastore} from '../datastore/idai-field-datastore';
import {SettingsService} from '../settings/settings-service';
import {ImageTypeUtility} from '../util/image-type-utility';

@Component({
    selector: 'document-edit-wrapper',
    moduleId: module.id,
    templateUrl: './document-edit-wrapper.html'
})

/**
 * Uses the document edit form of idai-components-2 and adds styling
 * and save and back buttons. The save button is used to save and
 * validate the document.
 *
 * @author Daniel de Oliveira
 * @author Thomas Kleinke
 */
export class DocumentEditWrapperComponent {

    /**
     * Holds a cloned version of the <code>document</code> field,
     * on which changes can be made which can be either saved or discarded later.
     */
    private clonedDocument: IdaiFieldDocument;

    @Input() document: IdaiFieldDocument;
    @Input() showBackButton: boolean = true;
    @Input() showDeleteButton: boolean = true;
    @Input() activeTab: string;

    @Output() onSaveSuccess = new EventEmitter<any>();
    @Output() onBackButtonClicked = new EventEmitter<any>();
    @Output() onDeleteSuccess = new EventEmitter<any>();

    public projectConfiguration: ProjectConfiguration;
    public typeLabel: string;
    public relationDefinitions: Array<RelationDefinition>;
    public projectImageTypes: any = {};
    public inspectedRevisionsIds: string[];

    constructor(
        private messages: Messages,
        private persistenceManager: PersistenceManager,
        private validator: Validator,
        private documentEditChangeMonitor: DocumentEditChangeMonitor,
        private configLoader: ConfigLoader,
        private settingsService: SettingsService,
        private modalService: NgbModal,
        private datastore: IdaiFieldDatastore,
        private imageTypeUtility: ImageTypeUtility
    ) {
        this.imageTypeUtility.getProjectImageTypes().then(
            projectImageTypes => this.projectImageTypes = projectImageTypes
        );
    }

    ngOnChanges() {

        this.configLoader.getProjectConfiguration().then(projectConfiguration => {

            if (!this.document) return;

            this.projectConfiguration = projectConfiguration;
            this.inspectedRevisionsIds = [];

            this.clonedDocument = DocumentEditWrapperComponent.cloneDocument(this.document);
            this.typeLabel = projectConfiguration.getLabelForType(this.document.resource.type);
            this.relationDefinitions = projectConfiguration.getRelationDefinitions(this.document.resource.type,
                'editable');
            this.persistenceManager.setOldVersions([this.document]);
        });
    }

    public save(viaSaveButton: boolean = false) {

        this.validator.validate(<IdaiFieldDocument> this.clonedDocument)
            .then(
                () => this.saveValidatedDocument(this.clonedDocument, viaSaveButton),
            ).then(
                () => this.messages.add([M.WIDGETS_SAVE_SUCCESS])
            ).catch(
                msgWithParams => {
                    if (msgWithParams) this.messages.add(msgWithParams);
                }
            );
    }

    /**
     * @param clonedDocument
     * @param viaSaveButton
     * @returns {Promise<TResult>} in case of error, rejects with
     *   either with <code>msgWithParams</code> or with <code>undefined</code>,
     *   depending on whether the error get handled within the method.
     */
    private saveValidatedDocument(clonedDocument: IdaiFieldDocument, viaSaveButton: boolean): Promise<any> {

        return this.persistenceManager.persist(clonedDocument, this.settingsService.getUsername()).then(
            () => this.removeInspectedRevisions(),
            errorWithParams => this.handlePersistError(errorWithParams)
        ).then(
            () => this.datastore.getLatestRevision(this.clonedDocument.resource.id),
        ).then(
            doc => {
                this.clonedDocument = doc;
                this.documentEditChangeMonitor.reset();

                this.onSaveSuccess.emit({
                    document: clonedDocument,
                    viaSaveButton: viaSaveButton
                });
            }
        ).catch(msgWithParams => { return Promise.reject(msgWithParams); })
    }

    private handlePersistError(errorWithParams) {
        
        if (errorWithParams[0] == DatastoreErrors.SAVE_CONFLICT) {
            this.handleSaveConflict();
        } else if (errorWithParams[0] == DatastoreErrors.DOCUMENT_DOES_NOT_EXIST_ERROR) {
            this.handleDeletedConflict();
        } else {
            console.error(errorWithParams);
            return Promise.reject([M.WIDGETS_SAVE_ERROR]);
        }
        return Promise.reject(undefined);
    }
    
    private removeInspectedRevisions(): Promise<any> {
        
        let promises = [];
        
        for (let revisionId of this.inspectedRevisionsIds) {
            promises.push(this.datastore.removeRevision(this.document.resource.id, revisionId));
        }

        this.inspectedRevisionsIds = [];

        return Promise.all(promises);
    }

    private handleDeletedConflict() {

        this.modalService.open(
            ConflictDeletedModalComponent, {size: 'lg', windowClass: 'conflict-deleted-modal'}
        ).result.then(decision => {

            // make the doc appear 'new' ...
            delete this.clonedDocument.resource.id; // ... for persistenceManager
            delete this.clonedDocument['_id'];      // ... for pouchdbdatastore
            delete this.clonedDocument['_rev'];     //

            this.showDeleteButton = false;

        }).catch(() => {});
    }

    private handleSaveConflict() {

        this.modalService.open(
            ConflictModalComponent, {size: 'lg', windowClass: 'conflict-modal'}
        ).result.then(decision => {
            if (decision == 'overwrite') this.overwriteLatestRevision();
            else this.reloadLatestRevision();
        }).catch(() => {});
    }

    private overwriteLatestRevision() {

        this.datastore.getLatestRevision(this.clonedDocument.resource.id).then(latestRevision => {
            this.clonedDocument['_rev'] = latestRevision['_rev'];
            this.save(true);
        }).catch(() => this.messages.add([M.APP_GENERIC_SAVE_ERROR]));
    }

    private reloadLatestRevision() {

        this.datastore.getLatestRevision(this.clonedDocument.resource.id).then(latestRevision => {
            this.clonedDocument = <IdaiFieldDocument> latestRevision;
        }).catch(() => this.messages.add([M.APP_GENERIC_SAVE_ERROR]));
    }
    
    public openDeleteModal(modal) {

        this.modalService.open(modal).result.then(result => {
            if (result == 'delete') this.delete();
        });
    }

    private delete() {

        return this.persistenceManager.remove(this.document).then(
            () => {
                this.onDeleteSuccess.emit();
                this.messages.add([M.WIDGETS_DELETE_SUCCESS]);
            },
            keyOfM => this.messages.add([keyOfM]));
    }

    private static cloneDocument(document: IdaiFieldDocument): IdaiFieldDocument {

        const clonedDoc = Object.assign({}, document);
        clonedDoc.resource = Object.assign({}, document.resource);

        return clonedDoc;
    }

}