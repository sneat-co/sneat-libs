import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { ISelectItem, SelectFromListComponent } from '@sneat/ui';
import { ICountry, CountriesLoaderService } from '../country-selector';

// How the country picker presents itself:
//  - 'list'     (default): an inline, searchable LIST while empty that collapses
//                to a compact dropdown once a country is chosen — the pattern the
//                contact wizard uses (via sneat-select-from-list).
//  - 'dropdown': always a dropdown (popover), even when empty.
export type CountryInputMode = 'list' | 'dropdown';

@Component({
  selector: 'sneat-country-input',
  templateUrl: './country-input.component.html',
  imports: [
    FormsModule,
    SelectFromListComponent,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonButtons,
    IonButton,
    IonIcon,
  ],
})
export class CountryInputComponent implements OnInit {
  private readonly countriesLoader = inject(CountriesLoaderService);

  @Input() mode: CountryInputMode = 'list';
  @Input() canReset = true;
  @Input() label = 'Country';
  @Input() countryID = '';
  @Output() countryIDChange = new EventEmitter<string>();

  readonly countries = signal<readonly ICountry[]>([]);

  // True when the country list failed to load — surfaced in the UI with a Retry.
  protected readonly loadFailed = this.countriesLoader.loadFailed;

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.countriesLoader.getCountries().then((countries) => {
      this.countries.set(countries);
    });
  }

  protected retry(): void {
    this.countriesLoader.reload().then(() => this.load());
  }

  // Dropdown mode: ion-select ngModel has already updated countryID.
  public onCountryChanged(): void {
    this.countryIDChange.emit(this.countryID);
  }

  // List mode: select-from-list emits the chosen id via (valueChange).
  protected onListValueChanged(countryID: string): void {
    this.countryID = countryID;
    this.countryIDChange.emit(countryID);
  }

  reset(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.countryID = '';
    this.countryIDChange.emit('');
  }

  // Match on ISO code as well as title (select-from-list filters title by default).
  protected readonly filterCountryByCode = (
    item: ISelectItem,
    filter: string,
  ): boolean => {
    const f = filter.trim().toUpperCase();
    const c = item as ICountry;
    return c.id === f || c.id3.startsWith(f);
  };
}
