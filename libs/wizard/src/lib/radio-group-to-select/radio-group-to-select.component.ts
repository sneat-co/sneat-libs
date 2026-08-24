import { Component, forwardRef, Input, ChangeDetectionStrategy } from '@angular/core';
import {
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular';
import { SelectOption } from './select-options';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

@Component({
  selector: 'sneat-radio-group-to-select',
  templateUrl: './radio-group-to-select.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioGroupToSelectComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonItem,
    IonSelect,
    FormsModule,
    IonSelectOption,
    IonRadioGroup,
    IonList,
    IonLabel,
    IonListHeader,
    IonRadio,
  ],
})
export class RadioGroupToSelectComponent implements ControlValueAccessor {
  v?: object;

  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() label?: string;
  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() selectLabel?: string;
  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() radioGroupLabel?: string;

  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() slot: 'start' | 'end' = 'start';

  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() selectOptions?: SelectOption[];

  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() disabled = false;

  private onChange: (v: object | undefined) => void = () => void 0;
  public onTouched: () => void = () => void 0;

  public onValChanged(event: Event): void {
    const e = event as CustomEvent;
    this.onChange(e.detail.value);
  }

  registerOnChange(fn: (v: unknown) => void): void {
    this.onChange = (v: unknown) => {
      fn(v);
    };
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  //get accessor
  get value(): object | undefined {
    return this.v;
  }

  //set accessor including call the onchange callback
  set value(v: object | undefined) {
    if (v !== this.v) {
      this.v = v;
      this.onChange(v);
    }
  }

  writeValue(obj: object | undefined): void {
    this.value = obj;
  }

  protected readonly screenLeft = screenLeft;
}
