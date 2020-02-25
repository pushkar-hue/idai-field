import {Injectable} from '@angular/core';
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import {FieldDocument, DatastoreErrors, Messages} from 'idai-components-2';
import {DeleteModalComponent} from './delete-modal.component';
import {PersistenceManager} from '../../../core/model/persistence-manager';
import {TypeUtility} from '../../../core/model/type-utility';
import {UsernameProvider} from '../../../core/settings/username-provider';
import {M} from '../../messages/m';
import {DeletionInProgressModalComponent} from './deletion-in-progress-modal.component';
import {Imagestore} from '../../../core/images/imagestore/imagestore';
import {DocumentDatastore} from '../../../core/datastore/document-datastore';
import {DescendantsUtility} from '../../../core/model/descendants-utility';
import {ProjectConfiguration} from '../../../core/configuration/project-configuration';


/**
 * @author Thomas Kleinke
 * @author Daniel de Oliveira
 */
@Injectable()
export class ResourceDeletion {

    constructor(private modalService: NgbModal,
                private persistenceManager: PersistenceManager,
                private imagestore: Imagestore,
                private typeUtility: TypeUtility,
                private projectConfiguration: ProjectConfiguration,
                private messages: Messages,
                private usernameProvider: UsernameProvider,
                private datastore: DocumentDatastore,
                private descendantsUtility: DescendantsUtility) {}


    public async delete(document: FieldDocument) {

        const modalRef: NgbModalRef = this.modalService.open(
            DeleteModalComponent, { keyboard: false }
        );
        modalRef.componentInstance.setDocument(document);
        modalRef.componentInstance.setCount(await this.descendantsUtility.fetchChildrenCount(document));

        if ((await modalRef.result) === 'delete') {
            await this.performDeletion(document);
        }
    }


    private async performDeletion(document: FieldDocument) {

        const modalRef: NgbModalRef = this.modalService.open(
            DeletionInProgressModalComponent, { backdrop: 'static', keyboard: false }
        );

        await this.deleteImageWithImageStore(document);
        await this.deleteWithPersistenceManager(document);

        modalRef.close();
    }


    private async deleteImageWithImageStore(document: FieldDocument) {

        if (!this.projectConfiguration.isSubtype(document.resource.type, 'Image')) return undefined;

        if (!this.imagestore.getPath()) throw [M.IMAGESTORE_ERROR_INVALID_PATH_DELETE];
        try {
            await this.imagestore.remove(document.resource.id);
        } catch {
            throw [M.IMAGESTORE_ERROR_DELETE, document.resource.id];
        }
    }


    private async deleteWithPersistenceManager(document: FieldDocument) {

        try {
            await this.persistenceManager.remove(document, this.usernameProvider.getUsername())
        } catch (removeError) {
            console.error('removeWithPersistenceManager', removeError);
            if (removeError !== DatastoreErrors.DOCUMENT_NOT_FOUND) throw [M.DOCEDIT_ERROR_DELETE];
        }
    }
}