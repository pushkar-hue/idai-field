import {Component} from '@angular/core';
import {IdaiFieldDocument} from '../model/idai-field-document';
import {Query} from 'idai-components-2/datastore';
import {ConfigLoader, IdaiType, ProjectConfiguration} from 'idai-components-2/configuration';
import {PersistenceManager} from 'idai-components-2/persist';
import {Messages} from 'idai-components-2/messages';
import {M} from '../m';
import {IdaiFieldDatastore} from '../datastore/idai-field-datastore';
import {SettingsService} from '../settings/settings-service';
import {EditModalComponent} from '../widgets/edit-modal.component';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';

@Component({
    moduleId: module.id,
    templateUrl: './list.html'
})

export class ListComponent {

    private detailedDocument: IdaiFieldDocument;
    public documents: IdaiFieldDocument[];
    public trenches: IdaiFieldDocument[];
    public selectedDocument: IdaiFieldDocument;
    public typesMap: { [type: string]: IdaiType };
    public typesList: IdaiType[];
    private projectConfiguration: ProjectConfiguration;

    protected query: Query = {q: '', type: 'resource', prefix: true};

    constructor(
        private messages: Messages,
        private datastore: IdaiFieldDatastore,
        private persistenceManager: PersistenceManager,
        private settingsService: SettingsService,
        private modalService: NgbModal,
        configLoader: ConfigLoader
    ) {
        this.fetchDocuments();
        this.fetchTrenches();
        configLoader.getProjectConfiguration().then(projectConfiguration => {
            this.projectConfiguration = projectConfiguration;
            this.initializeTypesList();
            this.addRelationsToTypesMap();
        });

    }

    private initializeTypesList() {
        let list = this.projectConfiguration.getTypesList();
        this.typesList = [];
        for (var type of list) {
            if (type.name != "image") {
                this.typesList.push(type);
            }
        }
    }

    public addRelationsToTypesMap() {
        this.typesMap = this.projectConfiguration.getTypesMap();

        for (let typeKey of Object.keys(this.typesMap)) {
            var relations = []
            let rawRelations = this.projectConfiguration.getRelationDefinitions(typeKey);
            for(let rel of rawRelations) {
                if (rel["visible"] != false) {
                    for(let target of rel["range"]) {
                        relations.push({name: rel["name"], targetName: target, label: rel["label"]})
                    }
                }
            }
            this.typesMap[typeKey]["relations"] = relations;
        }
    }

    public save(document: IdaiFieldDocument) : Promise<any> {
        if (document.resource.id) {
            return this.datastore.update(document).then(
                doc => {
                    this.messages.add([M.WIDGETS_SAVE_SUCCESS]);
                    return Promise.resolve(<IdaiFieldDocument>doc);
                })
                .catch(errorWithParams => {
                    // TODO replace with msg from M
                    this.messages.add(errorWithParams);
                    return Promise.reject([errorWithParams])
                });
        } else {
            return this.datastore.create(document).then(
                doc => {
                    this.messages.add([M.WIDGETS_SAVE_SUCCESS]);
                    return Promise.resolve(doc);
                })
                .catch(errorWithParams => {
                    // TODO replace with msg from M
                    this.messages.add(errorWithParams);
                    return Promise.reject([errorWithParams])
                });
        }

    }

    public focusDocument(doc: IdaiFieldDocument) {
        this.detailedDocument = doc;

        var detailModal = this.modalService.open(EditModalComponent,{size: "lg", backdrop: "static"}).componentInstance
        detailModal.setDocument(doc);
    }

    /**
     * Populates the document list with all documents from
     * the datastore which match a <code>query</code>
     * @param query
     */
    public fetchDocuments(query: Query = this.query) {
        this.detailedDocument = null;
        this.datastore.find(query).then(documents => {
            this.documents = documents as IdaiFieldDocument[];

        }).catch(err => { console.error(err); } );
    }

    private fetchTrenches() {
        let tquery: Query = {q: '', type: 'trench', prefix: true};
        this.datastore.find(tquery).then(documents => {
            this.trenches = documents as IdaiFieldDocument[];
        }).catch(err => { console.error(err); } );
    }

    public addDocument(new_doc_type): IdaiFieldDocument {
        // TODO - Use Validator class
        if (!new_doc_type || new_doc_type == '') {
            return
        }

        let newDoc = <IdaiFieldDocument> { "resource": { "relations": {}, "type": new_doc_type }, synced: 0 };


        this.documents.push(newDoc);
        return newDoc;
    }

    public addRelatedDocument(parentDocument: IdaiFieldDocument, relation, event) {
        if (!parentDocument || !relation) {
            return
        }

        event.target.value = "";

        let newDoc = this.addDocument(relation["targetName"]);

        this.save(newDoc).then(doc => {

            if (!parentDocument.resource.relations[relation["name"]]) {
                parentDocument.resource.relations[relation["name"]] = [];
            }
            parentDocument.resource.relations[relation["name"]].push(doc.resource.id);

            var oldVersion = JSON.parse(JSON.stringify(parentDocument));
            this.persistenceManager.persist(parentDocument, this.settingsService.getUserName(),
                    [oldVersion]).then(doc => {
                this.detailedDocument = newDoc;
            });
        })

    }

    public select(documentToSelect: IdaiFieldDocument) {
       this.selectedDocument = documentToSelect;
    }

    public queryChanged(query: Query) {
        this.query = query;
        this.fetchDocuments(query);
    }
}