import {Component, OnInit, ViewChild, TemplateRef} from "@angular/core";
import {ActivatedRoute, Router} from "@angular/router";
import {Datastore} from "idai-components-2/datastore";
import {ImageComponentBase} from "./image-component-base";
import {IndexeddbDatastore} from '../datastore/indexeddb-datastore';
import {Messages} from "idai-components-2/messages";
import {Mediastore} from "idai-components-2/datastore";
import {DomSanitizer} from "@angular/platform-browser";
import {NgbModal, NgbModalRef} from "@ng-bootstrap/ng-bootstrap";
import {ImageEditCanDeactivateGuard} from './image-edit-can-deactivate-guard';

@Component({
    moduleId: module.id,
    templateUrl: './image-edit-navigation.html'
})

/**
 * Handles the navigation for the resource edit workflow
 * by managing all the interaction between the document edit
 * form, a deactivate guard and a save options modal.
 *
 * @author Daniel de Oliveira
 */
export class ImageEditNavigationComponent extends ImageComponentBase implements OnInit {

    @ViewChild('modalTemplate')
    modalTemplate: TemplateRef<any>;
    modal: NgbModalRef;

    private idbDatastore;

    constructor(
        private router: Router,
        private modalService:NgbModal,
        private canDeactivateGuard:ImageEditCanDeactivateGuard,
        route: ActivatedRoute,
        datastore: Datastore,
        mediastore: Mediastore,
        sanitizer: DomSanitizer,
        messages: Messages
    ) {
        super(route,datastore,mediastore,sanitizer,messages);
        this.idbDatastore = datastore;
    }

    ngOnInit() {
        this.fetchDocAndImage();
    }

    public navigate(savedViaSaveButton:boolean) {
        if (!savedViaSaveButton) return this.canDeactivateGuard.proceed();
        
        this.router.navigate(['images',this.image.document.resource.id,'show']);
    }
    
    public showModal() {
        this.modal = this.modalService.open(this.modalTemplate);
    }
    
    public discard() {
        this.idbDatastore.refresh(this.image.document.resource.id).then(
            restoredObject => {
                this.canDeactivateGuard.proceed();
            },
            err => { console.error("error while refreshing document") }
        );
    }
}
