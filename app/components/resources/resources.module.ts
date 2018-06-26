import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {IdaiDocumentsModule} from 'idai-components-2/core';
import {IdaiWidgetsModule} from 'idai-components-2/widgets';
import {ProjectConfiguration} from 'idai-components-2/core';
import {ResourcesComponent} from './resources.component';
import {GeometryViewComponent} from './map/detail/geometry-view.component';
import {EditableMapComponent} from './map/map/editable-map.component';
import {ResourcesMapComponent} from './map/resources-map.component';
import {ListComponent} from './list/list.component';
import {RowComponent} from './list/row.component';
import {PlusButtonComponent} from './plus-button.component';
import {WidgetsModule} from '../../widgets/widgets.module';
import {DoceditModule} from '../docedit/docedit.module';
import {ResourcesState} from './state/resources-state';
import {ThumbnailViewComponent} from './map/detail/thumbnail-view.component';
import {ImageGridModule} from '../imagegrid/image-grid.module';
import {DocumentViewSidebarComponent} from './map/detail/document-detail-sidebar.component';
import {RoutingService} from '../routing-service';
import {DoceditLauncher} from './service/docedit-launcher';
import {ViewFacade} from './state/view-facade';
import {SettingsService} from '../../core/settings/settings-service';
import {SidebarListComponent} from './map/list/sidebar-list.component';
import {IdaiFieldDocumentDatastore} from '../../core/datastore/field/idai-field-document-datastore';
import {LayerManager} from './map/map/layer-manager';
import {LayerImageProvider} from './map/map/layer-image-provider';
import {LayerMenuComponent} from './map/map/layer-menu.component';
import {RemoteChangesStream} from '../../core/datastore/core/remote-changes-stream';
import {NavigationComponent} from './navigation/navigation.component';
import {NavigationService} from './navigation/navigation-service';
import {OperationViews} from './state/operation-views';
import {ResourcesSearchBarComponent} from './searchbar/resources-search-bar.component';
import {SearchSuggestionsComponent} from './searchbar/search-suggestions.component';
import {StandardStateSerializer} from '../../common/standard-state-serializer';
import {StateSerializer} from '../../common/state-serializer';
import {ViewDefinition} from './state/view-definition';
import {Loading} from '../../widgets/loading';

const remote = require('electron').remote;

@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        NgbModule,
        IdaiDocumentsModule,
        WidgetsModule,
        ImageGridModule,
        IdaiWidgetsModule,
        DoceditModule
    ],
    declarations: [
        ResourcesComponent,
        GeometryViewComponent,
        EditableMapComponent,
        ResourcesMapComponent,
        LayerMenuComponent,
        ListComponent,
        RowComponent,
        PlusButtonComponent,
        ThumbnailViewComponent,
        DocumentViewSidebarComponent,
        SidebarListComponent,
        NavigationComponent,
        ResourcesSearchBarComponent,
        SearchSuggestionsComponent
    ],
    providers: [
        { provide: StateSerializer, useClass: StandardStateSerializer },
        NavigationService,
        ResourcesState,
        RoutingService,
        DoceditLauncher,
        LayerManager,
        LayerImageProvider,
        {
            provide: ResourcesState,
            useFactory: (stateSerializer: StateSerializer,
                         projectConfiguration: ProjectConfiguration,
                         settingsService: SettingsService) => {

                const views: ViewDefinition[] = [
                    {
                        "label": "Schnitte",
                        "name": "excavation",
                        "operationSubtype": "Trench"
                    },
                    {
                        "label": "Bauaufnahmen",
                        "name": "Building",
                        "operationSubtype": "Building"
                    },
                    {
                        "label": "Surveys",
                        "name": "survey",
                        "operationSubtype": "Survey"
                    }
                ];
                for (let view of views) {
                    (view as any)['mainTypeLabel'] = projectConfiguration.getLabelForType(view.operationSubtype) as any;
                }

                const projectName = settingsService.getSelectedProject();
                if (!projectName) throw 'project not set';

                return new ResourcesState(
                    stateSerializer,
                    new OperationViews(views),
                    ['Place'],
                    projectName,
                    remote.getGlobal('switches').suppress_map_load_for_test
                );
            },
            deps: [StateSerializer, ProjectConfiguration, SettingsService]
        },
        {
            provide: ViewFacade,
            useFactory: function(
                projectConfiguration: ProjectConfiguration,
                datastore: IdaiFieldDocumentDatastore,
                changesStream: RemoteChangesStream,
                resourcesState: ResourcesState,
                loading: Loading
            ) {

                return new ViewFacade(
                    datastore,
                    changesStream,
                    resourcesState,
                    loading
                );
            },
            deps: [
                ProjectConfiguration,
                IdaiFieldDocumentDatastore,
                RemoteChangesStream,
                ResourcesState,
                Loading
            ]
        },
    ],
    exports: [
        GeometryViewComponent
    ]
})

export class ResourcesModule {}