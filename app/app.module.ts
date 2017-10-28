import {APP_INITIALIZER, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {HashLocationStrategy, LocationStrategy} from '@angular/common';
import {HttpModule} from '@angular/http';
import {FormsModule} from '@angular/forms';
import {Datastore, ReadDatastore} from 'idai-components-2/datastore';
import {IdaiMessagesModule, MD, Messages} from 'idai-components-2/messages';
import {DocumentEditChangeMonitor, IdaiDocumentsModule} from 'idai-components-2/documents';
import {PersistenceManager, Validator} from 'idai-components-2/persist';
import {IdaiFieldValidator} from './core/model/idai-field-validator';
import {ConfigLoader, ProjectConfiguration} from 'idai-components-2/configuration';
import {routing} from './app.routing';
import {CachedDatastore} from './core/datastore/cached-datastore';
import {M} from './m';
import {AppComponent} from './app.component';
import {ResourcesModule} from './components/resources/resources.module';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {Imagestore} from './core/imagestore/imagestore';
import {ReadImagestore} from './core/imagestore/read-imagestore';
import {ImageOverviewModule} from './components/imageoverview/image-overview.module';
import {NavbarComponent} from './components/navbar/navbar.component';
import {BlobMaker} from './core/imagestore/blob-maker';
import {Converter} from './core/imagestore/converter';
import {IdaiWidgetsModule} from 'idai-components-2/widgets';
import {SettingsModule} from './components/settings/settings.module';
import {IdaiFieldAppConfigurator, IdaiFieldDocument} from 'idai-components-2/idai-field-model';
import {SettingsService} from './core/settings/settings-service';
import {PouchdbServerDatastore} from './core/datastore/pouchdb-server-datastore';
import {TaskbarComponent} from './components/navbar/taskbar.component';
import {WidgetsModule} from './widgets/widgets.module';
import {ImageTypeUtility} from './common/image-type-utility';
import {PouchdbManager} from './core/datastore/core/pouchdb-manager';
import {PouchDbFsImagestore} from './core/imagestore/pouch-db-fs-imagestore';
import {SampleDataLoader} from './core/datastore/sample-data-loader';
import {ConstraintIndexer} from './core/datastore/core/constraint-indexer';
import {FulltextIndexer} from './core/datastore/core/fulltext-indexer';
import {DocumentCache} from './core/datastore/document-cache';
import {AppState} from './core/settings/app-state';
import {ConflictResolvingExtension} from './core/datastore/core/conflict-resolving-extension';
import {IdaiFieldConflictResolver} from './core/model/idai-field-conflict-resolver';
import {ConflictResolver} from './core/datastore/core/conflict-resolver';
import {ProjectsComponent} from './components/navbar/projects.component';
import {ImportModule} from './components/import/import-module';
import {ExportModule} from './components/export/export.module';
import {DoceditActiveTabService} from './components/docedit/docedit-active-tab-service';
import {ImageViewModule} from './components/imageview/image-view.module';
import {StateSerializer} from './common/state-serializer';
import {IdaiFieldReadDatastore} from './core/datastore/idai-field-read-datastore';
import {IdaiFieldDatastore} from './core/datastore/idai-field-datastore';
import {AppController} from "./app-controller";

const remote = require('electron').remote;

let pconf = undefined;

@NgModule({
    imports: [
        ImageOverviewModule,
        ImageViewModule,
        ResourcesModule,
        SettingsModule,
        BrowserModule,
        FormsModule,
        HttpModule,
        NgbModule.forRoot(),
        IdaiDocumentsModule,
        IdaiMessagesModule,
        routing,
        IdaiWidgetsModule,
        WidgetsModule,
        ImportModule,
        ExportModule,
    ],
    declarations: [
        AppComponent,
        NavbarComponent,
        TaskbarComponent,
        ProjectsComponent
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [IdaiFieldAppConfigurator, ConfigLoader, SettingsService],
            useFactory: function(appConfigurator: IdaiFieldAppConfigurator, configLoader: ConfigLoader, settingsService: SettingsService) {

                return() => {
                    const PROJECT_CONFIGURATION_PATH = remote.getGlobal('configurationPath');
                    appConfigurator.go(PROJECT_CONFIGURATION_PATH);

                    return configLoader.getProjectConfiguration().then(pc => {
                        pconf = pc;
                    }).catch(msgsWithParams => {

                        msgsWithParams.forEach(msg => {
                            console.error("err in project configuration", msg)
                        });
                        if (msgsWithParams.length > 1) {
                            console.error('num errors in project configuration', msgsWithParams.length);
                        }
                    })
                    .then(() => settingsService.init());
                }
            }
        },
        AppState,
        { provide: ConflictResolver, useClass: IdaiFieldConflictResolver },
        ConflictResolvingExtension,
        SettingsService,
        {
            provide: ConstraintIndexer,
            useFactory: function() {
                return new ConstraintIndexer([
                    { path: 'resource.relations.isRecordedIn', type: 'contain' },
                    { path: 'resource.relations.liesWithin', type: 'contain' },
                    { path: 'resource.relations.depicts', type: 'exist' },
                    { path: 'resource.identifier', type: 'match' },
                    { path: '_conflicts', type: 'exist' }
                ]);
            }
        },
        ImageTypeUtility,
        FulltextIndexer,
        SampleDataLoader,
        { provide: PouchdbManager, useFactory: function(
                sampleDataLoader: SampleDataLoader,
                constraintIndexer: ConstraintIndexer,
                fulltextIndexer: FulltextIndexer
            ){
                return new PouchdbManager(
                    sampleDataLoader,
                    constraintIndexer,
                    fulltextIndexer);
            },
            deps: [SampleDataLoader, ConstraintIndexer, FulltextIndexer]
        },
        { provide: Imagestore, useClass: PouchDbFsImagestore },
        { provide: ReadImagestore, useExisting: Imagestore },
        { provide: LocationStrategy, useClass: HashLocationStrategy },
        DocumentCache,
        {
            provide: IdaiFieldDatastore,
            useFactory: function(pouchdbManager: PouchdbManager,
                                 constraintIndexer: ConstraintIndexer,
                                 fulltextIndexer: FulltextIndexer,
                                 documentCache: DocumentCache<IdaiFieldDocument>,
                                 appState: AppState,
                                 autoConflictResolvingExtension: ConflictResolvingExtension,
                                 imageTypeUtility: ImageTypeUtility,
                                 conflictResolver: ConflictResolver): CachedDatastore<IdaiFieldDocument> {
                return new CachedDatastore(
                    new PouchdbServerDatastore(pouchdbManager,
                        constraintIndexer, fulltextIndexer,
                        appState, autoConflictResolvingExtension, conflictResolver),
                    documentCache, imageTypeUtility);
            },
            deps: [PouchdbManager, ConstraintIndexer,
                FulltextIndexer, DocumentCache,
                AppState, ConflictResolvingExtension, ImageTypeUtility, ConflictResolver]
        },
        { provide: Datastore, useExisting: IdaiFieldDatastore },
        { provide: ReadDatastore, useExisting: IdaiFieldDatastore },
        { provide: IdaiFieldReadDatastore, useExisting: IdaiFieldDatastore },
        Messages,
        BlobMaker,
        Converter,
        AppController,
        IdaiFieldAppConfigurator,
        ConfigLoader,
        {
            provide: ProjectConfiguration,
            useFactory: () => {
                if (!pconf) {
                    console.error("pconf has not yet been provided");
                    throw "pconf has not yet been provided";
                }
                return pconf;
            },
            deps: []
        },
        PersistenceManager,
        DocumentEditChangeMonitor,
        {
            provide: Validator,
            useFactory: function(configLoader: ConfigLoader, datastore: CachedDatastore<IdaiFieldDocument>) {
                return new IdaiFieldValidator(configLoader, datastore);
            },
            deps: [ConfigLoader, ReadDatastore]
        },
        { provide: MD, useClass: M},
        DoceditActiveTabService,
        StateSerializer
    ],
    bootstrap: [ AppComponent ]
})
export class AppModule { }