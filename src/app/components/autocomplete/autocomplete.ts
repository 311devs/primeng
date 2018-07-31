import {
    NgModule, Component, ViewChild, ElementRef, AfterViewInit, DoCheck, AfterViewChecked, Input, Output,
    EventEmitter, ContentChildren, QueryList, TemplateRef, Renderer2, forwardRef, ChangeDetectorRef, IterableDiffers,
    NgZone
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {InputTextModule} from '../inputtext/inputtext';
import {ButtonModule} from '../button/button';
import {SharedModule,PrimeTemplate} from '../common/shared';
import {DomHandler} from '../dom/domhandler';
import {ObjectUtils} from '../utils/objectutils';
import {NG_VALUE_ACCESSOR, ControlValueAccessor} from '@angular/forms';

export const AUTOCOMPLETE_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => AutoComplete),
  multi: true
};

@Component({
    selector: 'p-autoComplete',
    template: `
        <span
            [ngClass]="{'ui-autocomplete ui-widget':true,'ui-autocomplete-dd':dropdown,'ui-autocomplete-multiple':multiple}"
            [ngStyle]="style" [class]="styleClass">
            <input *ngIf="!multiple" #in [attr.type]="type" [attr.id]="inputId" [ngStyle]="inputStyle"
                   [class]="inputStyleClass" autocomplete="off" [attr.required]="required"
                   [ngClass]="'ui-inputtext ui-widget ui-state-default ui-corner-all ui-autocomplete-input'"
                   [value]="inputFieldValue"
                   (click)="onInputClick($event)" (input)="onInput($event)" (keydown)="onKeydown($event)"
                   (keyup)="onKeyup($event)" (focus)="onInputFocus($event)" (blur)="onInputBlur($event)"
                   (change)="onInputChange($event)"
                   [attr.placeholder]="placeholder" [attr.size]="size" [attr.maxlength]="maxlength"
                   [attr.tabindex]="tabindex" [readonly]="readonly" [disabled]="disabled"
            ><span *ngIf="!multiple" (click)="onInputClick($event)" class="dropdown-triangle" [style.top]="'15px'" ></span>
            <span class="reset-cross" *ngIf="showResetButton()" (click)="resetFilter()" [title]="resetFilterTitle">x</span>
            <ul *ngIf="multiple" #multiContainer (click)="onMultiContainerClick($event)"
                 class="ui-autocomplete-multiple-container ui-widget ui-inputtext ui-state-default ui-corner-all"
                 [ngClass]="{'ui-state-disabled':disabled,'ui-state-focus':focus}" (click)="multiIn.focus()">
                <ng-container *ngIf="!selectedHidden"><li #token *ngFor="let val of value" class="ui-autocomplete-token ui-state-highlight ui-corner-all">
                    <span class="ui-autocomplete-token-icon pi pi-fw pi-times" (click)="removeItem(token)"
                          *ngIf="!disabled"></span>
                    <span *ngIf="!selectedItemTemplate"
                          class="ui-autocomplete-token-label">{{field ? objectUtils.resolveFieldData(val, field) : val}}</span>
                    <ng-container *ngTemplateOutlet="selectedItemTemplate; context: {$implicit: val}"></ng-container>
                </li></ng-container>
                <li class="ui-autocomplete-input-token">
                    <input #multiIn [attr.type]="type" [attr.id]="inputId" [disabled]="disabled" [attr.title]="getTitle()"
                           [attr.placeholder]="getPlaceHolder()" [attr.tabindex]="tabindex"
                           (input)="onInput($event)" (click)="onInputClick($event)"
                           (keydown)="onKeydown($event)" [readonly]="readonly" (keyup)="onKeyup($event)"
                           (focus)="onInputFocus($event)" (blur)="onInputBlur($event)" (change)="onInputChange($event)"
                           autocomplete="off" [ngStyle]="inputStyle" [class]="inputStyleClass"><span (click)="onInputClick($event)" class="dropdown-triangle" [style.top]="'50%'"></span>
                    <span class="reset-cross" *ngIf="value && value.length && selectedHidden && this.multiple" (click)="resetFilter()" [title]="resetFilterTitle">x</span>
                </li>
            </ul>
            <div #panel class="ui-autocomplete-panel ui-widget-content ui-corner-all ui-shadow"
                 [style.display]="panelVisible ? 'block' : 'none'" [style.width]="appendTo ? 'auto' : '100%'"
                 [style.max-height]="scrollHeight">
                <ul class="ui-autocomplete-items ui-autocomplete-list ui-widget-content ui-widget ui-corner-all ui-helper-reset"
                    *ngIf="panelVisible">
                    <li *ngFor="let option of suggestions | slice:first:(first + (page * rows)); let idx = index"
                        [ngClass]="{'ui-autocomplete-list-item ui-corner-all':true,'ui-state-highlight':(highlightOption==option)}"
                        (mouseenter)="highlightOption=option" (mouseleave)="highlightOption=null"
                        (click)="selectItem(option)">
                        <span
                            *ngIf="!itemTemplate">{{field ? objectUtils.resolveFieldData(option, field) : option}}</span>
                        <ng-container
                            *ngTemplateOutlet="itemTemplate; context: {$implicit: option, index: idx}"></ng-container>
                    </li>
                    <li *ngIf="noResults && emptyMessage" class="ui-autocomplete-list-item ui-corner-all">{{emptyMessage}}</li>
                </ul>
            </div>
        </span>
    `,
    host: {
        '[class.ui-inputwrapper-filled]': 'filled',
        '[class.ui-inputwrapper-focus]': 'focus && !disabled'
    },
    providers: [DomHandler,ObjectUtils,AUTOCOMPLETE_VALUE_ACCESSOR]
})
export class AutoComplete implements AfterViewInit,AfterViewChecked,DoCheck,ControlValueAccessor {

    @Input() minLength: number = 1;

    @Input() delay: number = 300;

    @Input() selectedItemsLabel: string = '{0} items selected';

    @Input() style: any;

    @Input() styleClass: string;

    @Input() inputStyle: any;

    @Input() inputId: string;

    @Input() inputStyleClass: string;

    @Input() placeholder: string;

    @Input() readonly: boolean;

    @Input() disabled: boolean;

    @Input() maxlength: number;

    @Input() required: boolean;

    @Input() size: number;

    @Input() appendTo: any;

    @Input() autoHighlight: boolean;

    @Input() forceSelection: boolean;

    @Input() type: string = 'text';

    @Output() completeMethod: EventEmitter<any> = new EventEmitter();

    @Output() onReset: EventEmitter<any> = new EventEmitter();

    @Output() onSelect: EventEmitter<any> = new EventEmitter();

    @Output() onUnselect: EventEmitter<any> = new EventEmitter();

    @Output() onFocus: EventEmitter<any> = new EventEmitter();

    @Output() onBlur: EventEmitter<any> = new EventEmitter();

    @Output() onKeyUp: EventEmitter<any> = new EventEmitter();

    @Input() field: string;

    @Input() scrollHeight: string = '200px';

    @Input() dropdown: boolean = true;

    @Input() multiple: boolean;

    @Input() tabindex: number;

    @Input() dataKey: string;

    @Input() emptyMessage: string = "No data";

    @Input() immutable: boolean = true;

    @ViewChild('in') inputEL: ElementRef;

    @ViewChild('multiIn') multiInputEL: ElementRef;

    @ViewChild('panel') panelEL: ElementRef;

    @ViewChild('multiContainer') multiContainerEL: ElementRef;

    @ViewChild('ddBtn') dropdownButton: ElementRef;

    @ContentChildren(PrimeTemplate) templates: QueryList<any>;

    itemTemplate: TemplateRef<any>;

    selectedItemTemplate: TemplateRef<any>;

    value: any;

    _suggestions: any[];

    @Input() resetFilterTitle: string = 'Reset filter';

    @Input() optionsName: string;

    onModelChange: Function = () => {
    };

    onModelTouched: Function = () => {
    };

    timeout: any;

    panelVisible: boolean = false;

    documentClickListener: any;

    suggestionsUpdated: boolean;

    highlightOption: any;

    highlightOptionChanged: boolean;

    focus: boolean = false;

    filled: boolean;

    inputClick: boolean;

    itemSelect:boolean;

    multiConteinerClick: boolean;

    selectedHidden: boolean = true;

    inputKeyDown: boolean;

    noResults: boolean;

    differ: any;

    inputFieldValue: string = null;

    savedInputValue: string = null;

    //for lazy scrolling

    @Input() rows: number = 15;

    @Input() lazy: boolean = false;

    @Input() buffer: number = 0.9;

    @Input() totalRecords: number;

    first: number = 0;

    inlineScrollListener: any;

    page: number = 0;

    searching: boolean = false;

    constructor(public el: ElementRef, public domHandler: DomHandler, public renderer: Renderer2, public objectUtils: ObjectUtils, public cd: ChangeDetectorRef, public differs: IterableDiffers, public zone: NgZone) {
        this.differ = differs.find([]).create(null);
    }

    @Input() get suggestions(): any[] {
        return this._suggestions;
    }

    set suggestions(val:any[]) {
        this._suggestions = val;
        if(this.immutable) {
            this.handleSuggestionsChange();
        }
    }

    ngDoCheck() {
        if(!this.immutable) {
            let changes = this.differ.diff(this.suggestions);
            if(changes) {
                this.handleSuggestionsChange();
            }
        }
    }

    showResetButton() {
        return (!this.multiple && (this.value && this.value.length) || (this.inputEL && this.inputEL.nativeElement.value.length));
    }

    handleSuggestionsChange() {
        if(this._suggestions != null) { //async pipe support
            if(this.panelEL && this.panelEL.nativeElement) {
                this.highlightOption = null;
                if(this._suggestions && this._suggestions.length) {
                    this.noResults = false;
                    this.show();
                    this.suggestionsUpdated = true;

                    if(this.autoHighlight) {
                        this.highlightOption = this._suggestions[0];
                    }
                }
                else {
                    this.noResults = true;

                    if(this.emptyMessage) {
                        this.show();
                        this.suggestionsUpdated = true;
                    }
                    else {
                        this.hide();
                    }
                }
            }
        }
    }

    ngAfterContentInit() {
        this.templates.forEach((item) => {
            switch(item.getType()) {
                case 'item':
                    this.itemTemplate = item.template;
                break;

                case 'selectedItem':
                    this.selectedItemTemplate = item.template;
                break;

                default:
                    this.itemTemplate = item.template;
                break;
            }
        });
    }

    ngAfterViewInit() {
        if(this.appendTo) {
            if(this.appendTo === 'body')
                document.body.appendChild(this.panelEL.nativeElement);
            else
                this.domHandler.appendChild(this.panelEL.nativeElement, this.appendTo);
        }
        this.bindScrollListener();
    }

    ngAfterViewChecked() {
        //Use timeouts as since Angular 4.2, AfterViewChecked is broken and not called after panel is updated
        if(this.suggestionsUpdated && this.panelEL.nativeElement && this.panelEL.nativeElement.offsetParent) {
            setTimeout(() => this.align(), 1);
            this.suggestionsUpdated = false;
        }

        if(this.highlightOptionChanged) {
            setTimeout(() => {
                let listItem = this.domHandler.findSingle(this.panelEL.nativeElement, 'li.ui-state-highlight');
                if(listItem) {
                    this.domHandler.scrollInView(this.panelEL.nativeElement, listItem);
                }
            }, 1);
            this.highlightOptionChanged = false;
        }
    }

    writeValue(value: any) : void {
        this.value = value;
        this.filled = this.value && this.value != '';
        this.updateInputField();
    }

    registerOnChange(fn: Function): void {
        this.onModelChange = fn;
    }

    registerOnTouched(fn: Function): void {
        this.onModelTouched = fn;
    }

    setDisabledState(val: boolean): void {
        this.disabled = val;
    }

    onInput(event: KeyboardEvent) {
        if(!this.inputKeyDown) {
            return;
        }
        if (!this.multiple && this.value && this.inputEL.nativeElement.value != this.value.label)
            this.value = null;

        if(this.timeout) {
            clearTimeout(this.timeout);
        }

        let value = (<HTMLInputElement> event.target).value;
        if(!this.multiple && !this.forceSelection) {
            this.onModelChange(value);
        }

        if ((value.length >= this.minLength) || (value.length === 0)) {
            this.page = 0;
            this.timeout = setTimeout(() => {
                this.search(event, value.trim());
            }, this.delay);
        }
        else {
            this.hide();
        }
        this.updateFilledState();
        this.inputKeyDown = false;
    }

    searchOnClick(event) {
        let queryValue = this.multiple ? this.multiInputEL.nativeElement.value : this.inputEL.nativeElement.value;
        this.search(event, queryValue);
        this.bindDocumentClickListener();
    }

    onInputClick(event: MouseEvent) {
        this.inputClick = true;
        if (this.multiple && this.savedInputValue) {
            this.multiInputEL.nativeElement.value = this.savedInputValue;
            this.savedInputValue = '';
        }
        this.searchOnClick(event);
    }

    onMultiContainerClick(event: MouseEvent) {
        if (!this.inputClick) {
            this.multiConteinerClick = true;
            if (this.savedInputValue) {
                this.multiInputEL.nativeElement.value = this.savedInputValue;
                this.savedInputValue = '';
            }
            this.searchOnClick(event);
        }
    }

    resetFilter(): void {
        if (this.multiple) {
            this.multiInputEL.nativeElement.value = this.savedInputValue = '';
            this.value = [];
        }
        else {
            this.inputEL.nativeElement.value = null;
            this.value = null;
        }
        this.onModelChange(this.value);
        this.onReset.emit();
    }

    getPlaceHolder() {
        if (this.value && this.value.length && this.selectedHidden) {
            let pattern = /{(.*?)}/;
            if (pattern.test(this.selectedItemsLabel))
                return this.selectedItemsLabel.replace(this.selectedItemsLabel.match(pattern)[0], this.value.length + '');
            return;
        }
        else if (this.value && this.value.length && !this.selectedHidden)
            return;
        else if (!this.value || !this.value.length)
            return this.placeholder;
    }

    getTitle() {
        if (this.value && this.value.length) {
            let selectedLabels = [];
            for (let val of this.value)
                selectedLabels.push(val.label);
            return selectedLabels.join();
        }
        return;
    }
    search(event: any, query: string) {
        //allow empty string but not undefined or null
        if(query === undefined || query === null) {
            return;
        }
        if ((event.type == 'click') && this.page > 0) {
            this.show();
		    return;
        }
        if (!this.searching) {
            this.searching = true;
            this.completeMethod.emit({
                first: this.page * this.rows,
                rows: this.rows,
                query: (!this.multiple && this.value) ? "" : query
            });
            this.page = this.page + 1;
        }
    }

    selectItem(option: any, focus: boolean = true) {
        this.itemSelect = true;
        if (this.multiple) {
            this.value = this.value||[];
            if(!this.isSelected(option)) {
                this.value = [...this.value,option];
                this.onModelChange(this.value);
            }
        }
        else {
            this.inputEL.nativeElement.value = this.field ? this.objectUtils.resolveFieldData(option, this.field)||'': option;
            this.value = option;
            this.onModelChange(this.value);
        }

        this.onSelect.emit(option);
        this.updateFilledState();

        if(focus) {
            this.focusInput();
        }
    }

    show() {
        if(this.multiInputEL || this.inputEL) {
            let el = (this.multiple) ? (document.activeElement == this.multiInputEL.nativeElement) : (document.activeElement == this.inputEL.nativeElement);
            let hasFocus = el || this.inputClick || this.multiConteinerClick;
            if(!this.panelVisible && hasFocus && !(!this.multiple && this.itemSelect && !this.inputClick && !this.multiConteinerClick)) {
                this.panelVisible = true;
                if(this.appendTo) {
                    this.panelEL.nativeElement.style.minWidth = this.domHandler.getWidth(this.el.nativeElement.children[0]) + 'px';
                }
                this.panelEL.nativeElement.style.zIndex = ++DomHandler.zindex;
                this.domHandler.fadeIn(this.panelEL.nativeElement, 200);
                this.bindDocumentClickListener();
            }
        }
    }

    align() {
        if(this.appendTo)
            this.domHandler.absolutePosition(this.panelEL.nativeElement, (this.multiple ? this.multiContainerEL.nativeElement : this.inputEL.nativeElement));
        else
            this.domHandler.relativePosition(this.panelEL.nativeElement, (this.multiple ? this.multiContainerEL.nativeElement : this.inputEL.nativeElement));
    }

    hide() {
        this.panelVisible = false;
        this.unbindDocumentClickListener();
    }

    focusInput() {
        if(this.multiple)
            this.multiInputEL.nativeElement.focus();
        else
            this.inputEL.nativeElement.focus();
    }

    removeItem(item: any) {
        let itemIndex = this.domHandler.index(item);
        let removedValue = this.value[itemIndex];
        this.value = this.value.filter((val, i) => i!=itemIndex);
        this.onModelChange(this.value);
        this.updateFilledState();
        this.onUnselect.emit(removedValue);
    }

    onKeydown(event) {
        if(this.panelVisible) {
            let highlightItemIndex = this.findOptionIndex(this.highlightOption);

            switch(event.which) {
                //down
                case 40:
                    if(highlightItemIndex != -1) {
                        var nextItemIndex = highlightItemIndex + 1;
                        if(nextItemIndex != (this.suggestions.length)) {
                            this.highlightOption = this.suggestions[nextItemIndex];
                            this.highlightOptionChanged = true;
                        }
                    }
                    else {
                        this.highlightOption = this.suggestions[0];
                    }

                    event.preventDefault();
                break;

                //up
                case 38:
                    if(highlightItemIndex > 0) {
                        let prevItemIndex = highlightItemIndex - 1;
                        this.highlightOption = this.suggestions[prevItemIndex];
                        this.highlightOptionChanged = true;
                    }

                    event.preventDefault();
                break;

                //enter
                case 13:
                    if(this.highlightOption) {
                        this.selectItem(this.highlightOption);
                        this.hide();
                    }
                    event.preventDefault();
                break;

                //escape
                case 27:
                    this.hide();
                    this._hideFullElement();
                    event.preventDefault();
                break;


                //tab
                case 9:
                    this._hideFullElement();
                    this.hide();
                break;
            }
        } else {
            if(event.which === 40 && this.suggestions) {
                this.search(event,event.target.value);
            }
        }

        if(this.multiple) {
            switch(event.which) {
                //backspace
                case 8:
                    if(this.value && this.value.length && !this.multiInputEL.nativeElement.value) {
                        this.value = [...this.value];
                        const removedValue = this.value.pop();
                        this.onModelChange(this.value);
                        this.updateFilledState();
                        this.onUnselect.emit(removedValue);
                    }
                break;
            }
        }

        this.inputKeyDown = true;
    }

    onKeyup(event) {
        this.onKeyUp.emit(event);
    }

    onInputFocus(event) {
        this.focus = true;
        this.onFocus.emit(event);
    }

    onInputBlur(event) {
        this.focus = false;
        this.onModelTouched();
        this.onBlur.emit(event);
    }

    onInputChange(event) {
        if(this.forceSelection && this.suggestions) {
            let valid = false;
            let inputValue = event.target.value.trim();

            if(this.suggestions)  {
                for(let suggestion of this.suggestions) {
                    let itemValue = this.field ? this.objectUtils.resolveFieldData(suggestion, this.field) : suggestion;
                    if(itemValue && inputValue === itemValue.trim()) {
                        valid = true;
                        this.selectItem(suggestion, false);
                        break;
                    }
                }
            }

            if(!valid) {
                if(this.multiple) {
                    this.multiInputEL.nativeElement.value = '';
                }
                else {
                    this.value = null;
                    this.inputEL.nativeElement.value = '';
                }

                this.onModelChange(this.value);
            }
        }
    }

    isSelected(val: any): boolean {
        let selected: boolean = false;
        if(this.value && this.value.length) {
            for(let i = 0; i < this.value.length; i++) {
                if(this.objectUtils.equals(this.value[i], val, this.dataKey)) {
                    selected = true;
                    break;
                }
            }
        }
        return selected;
    }

    findOptionIndex(option): number {
        let index: number = -1;
        if(this.suggestions) {
            for(let i = 0; i < this.suggestions.length; i++) {
                if(this.objectUtils.equals(option, this.suggestions[i])) {
                    index = i;
                    break;
                }
            }
        }

        return index;
    }

    updateFilledState() {
        if(this.multiple)
            this.filled = (this.value && this.value.length) || (this.multiInputEL && this.multiInputEL.nativeElement && this.multiInputEL.nativeElement.value != '');
        else
            this.filled = (this.inputFieldValue && this.inputFieldValue != '') || (this.inputEL && this.inputEL.nativeElement && this.inputEL.nativeElement.value != '');;
    }

    updateInputField() {
        let formattedValue = this.value ? (this.field ? this.objectUtils.resolveFieldData(this.value, this.field)||'' : this.value) : '';
        this.inputFieldValue = formattedValue;

        if(this.inputEL && this.inputEL.nativeElement) {
            this.inputEL.nativeElement.value = formattedValue;
        }

        this.updateFilledState();
    }

    _hideFullElement() {
        if (this.multiple) {
            this.savedInputValue = this.multiInputEL.nativeElement.value;
            this.multiInputEL.nativeElement.value = '';
        }
        if (this.value && this.value.length)
            this.selectedHidden = true;
    }

    bindDocumentClickListener() {
        this.selectedHidden = false;
        if (!this.documentClickListener) {
            this.documentClickListener = this.renderer.listen('document', 'click', (event) => {
                if(event.which === 3) {
                    return;
                }

                if (!this.inputClick && !this.itemSelect && !this.multiConteinerClick)  {
                    this.hide();
                    this._hideFullElement();
                }

                this.inputClick = false;
                this.itemSelect = false;
                this.multiConteinerClick = false;
                this.cd.markForCheck();
            });
        }
    }

    unbindDocumentClickListener() {
        if(this.documentClickListener) {
            this.documentClickListener();
            this.documentClickListener = null;
        }
    }

    bindScrollListener() {
        this.zone.runOutsideAngular(() => {
            this.inlineScrollListener = this.onInlineScroll.bind(this);
            this.panelEL.nativeElement.addEventListener('scroll', this.inlineScrollListener);
        });
    }

    unbindScrollListener() {
        this.panelEL.nativeElement.removeEventListener('scroll', this.inlineScrollListener);
    }

    onInlineScroll(event) {
        const scrollTop = this.panelEL.nativeElement.scrollTop;
        const scrollHeight = this.panelEL.nativeElement.scrollHeight;
        const viewportHeight = this.panelEL.nativeElement.clientHeight;
        const queryValue = this.multiple ? this.multiInputEL.nativeElement.value : this.inputEL.nativeElement.value;

        if((scrollTop >= ((scrollHeight * this.buffer) - (viewportHeight)))) {
            if(this.shouldLoad()) {
                this.zone.run(() => {
                    this.search(event, queryValue);
                });
            }
        }
    }

    shouldLoad() {
        if(this.lazy)
            return ((this.rows * this.page < this.totalRecords) && !this.searching);
        else
            return this.suggestions && this.suggestions.length && (this.rows * this.page < this.suggestions.length);
    }

    ngOnDestroy() {
        this.unbindDocumentClickListener();

        if(this.appendTo) {
            this.el.nativeElement.appendChild(this.panelEL.nativeElement);
        }

        this.unbindScrollListener();
    }
}

@NgModule({
    imports: [CommonModule,InputTextModule,ButtonModule,SharedModule],
    exports: [AutoComplete,SharedModule],
    declarations: [AutoComplete]
})
export class AutoCompleteModule {
}
