import {ResourcesComponent} from './resources.component';
import {ViewFacade} from './view/view-facade';
import {Loading} from '../../widgets/loading';
import {NavigationPath} from './navigation-path';

/**
 * A base class for all lists, e.g. sidebarList and List components
 *
 * @author Philipp Gerth
 */

export class BaseList {

    public navigationPath: NavigationPath = { elements: [] };

    constructor(
        public resourcesComponent: ResourcesComponent,
        public viewFacade: ViewFacade,
        private loading: Loading
    ) {
        this.viewFacade.navigationPathNotifications().subscribe(path => {
            this.navigationPath = path;
        });
    }


    public showPlusButton() {

        return (!this.resourcesComponent.isEditingGeometry && this.resourcesComponent.ready
            && !this.loading.showIcons && this.viewFacade.getQuery().q == ''
            && (this.viewFacade.isInOverview() || this.viewFacade.getSelectedMainTypeDocument()));
    }

}