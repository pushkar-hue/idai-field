import { Component, ElementRef, Input } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProjectConfiguration } from 'idai-field-core';
import { SearchBarComponent } from '../../widgets/search-bar.component';
import { Menus } from '../../../services/menus';
import { Messages } from '../../messages/messages';
import { QrCodeService } from '../service/qr-code-service';


@Component({
    selector: 'resources-search-bar',
    templateUrl: './resources-search-bar.html',
    host: {
        '(document:click)': 'handleClick($event)'
    }
})
/**
 * @author Thomas Kleinke
 * @author Danilo Guzzo
 */
export class ResourcesSearchBarComponent extends SearchBarComponent {

    @Input() extendedSearch: boolean;

    public suggestionsVisible: boolean = false;


    constructor(private elementRef: ElementRef,
                private qrCodeService: QrCodeService,
                private projectConfiguration: ProjectConfiguration) {

        super();
    }


    public getSelectedCategory(): string | undefined {

        return this.categories !== undefined && this.categories.length > 0
            ? this.categories[0]
            : undefined;
    }


    public showSuggestions() {

        this.suggestionsVisible = true;
    }


    public hideSuggestions() {

        this.suggestionsVisible = false;
    }


    public isCategorySelected(): boolean {

        return this.categories !== undefined && this.categories.length > 0;
    }


    public handleClick(event: Event) {

        let target: any = event.target;
        let insideFilterMenu: boolean = false;
        let insideSearchBarComponent: boolean = false;

        do {
            if (target.id === 'resources-search-bar-filter-button'
                    || target.id === 'resources-search-bar-filter-menu') {
                insideFilterMenu = true;
            }
            if (target === this.elementRef.nativeElement) insideSearchBarComponent = true;

            target = target.parentNode;
        } while (target);

        if (!insideFilterMenu && this.popover) this.popover.close();
        if (!insideSearchBarComponent) this.hideSuggestions();
    }


    public isQrCodeScannerButtonVisible(): boolean {
        
        return this.projectConfiguration.getQrCodeCategories().length > 0;
    }


    public async scanQrCode() {

        const scannedCode: string = await this.qrCodeService.scanCode();
        if (scannedCode) await this.qrCodeService.openDocumentFromScannedCode(scannedCode);
    }
}
