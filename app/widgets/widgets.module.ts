import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {FormsModule} from '@angular/forms';
import {IdaiDocumentsModule} from 'idai-components-2/documents';
import {DocumentViewComponent} from 'idai-components-2/documents';
import {DocumentEditWrapperComponent} from './document-edit-wrapper.component';
import {EditSaveDialogComponent} from './edit-save-dialog.component';
import {RouterModule} from '@angular/router';
import {DocumentPickerComponent} from './document-picker.component';
import {DocumentTeaserComponent} from './document-teaser.component';
import {ThumbnailViewComponent} from './thumbnail-view.component';
import {DescriptionViewComponent} from './description-view.component';
import {ImagePickerComponent} from './image-picker.component';
import {ConflictModalComponent} from "./conflict-modal.component";
import {IdaiWidgetsModule} from 'idai-components-2/widgets';

@NgModule({
    imports: [
        BrowserModule,
        NgbModule,
        FormsModule,
        IdaiWidgetsModule,
        IdaiDocumentsModule,
        RouterModule
    ],
    declarations: [
        DocumentEditWrapperComponent,
        DocumentTeaserComponent,
        EditSaveDialogComponent,
        DocumentPickerComponent,
        ThumbnailViewComponent,
        DescriptionViewComponent,
        ImagePickerComponent,
        ConflictModalComponent
    ],
    exports : [
        DocumentViewComponent,
        DocumentEditWrapperComponent,
        DocumentTeaserComponent,
        EditSaveDialogComponent,
        DocumentPickerComponent,
        ThumbnailViewComponent,
        DescriptionViewComponent
    ],
    entryComponents: [
        ImagePickerComponent,
        ConflictModalComponent
    ]
})

export class WidgetsModule {}