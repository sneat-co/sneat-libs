import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ContactsAsBadgesComponent } from './contacts-as-badges.component';

describe('ContactsAsBadgesComponent', () => {
  let component: ContactsAsBadgesComponent;
  let fixture: ComponentFixture<ContactsAsBadgesComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactsAsBadgesComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(ContactsAsBadgesComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactsAsBadgesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$contacts', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const stop = () => ({ stopPropagation: vi.fn() }) as unknown as Event;

  it('delete tracks the contact as deleting and emits it', () => {
    fixture.componentRef.setInput('$contacts', [
      { id: 'c1', brief: {} },
      { id: 'c2', brief: {} },
    ]);
    fixture.detectChanges();
    const emit = vi.spyOn(component.deleteContact, 'emit');
    c().delete(stop(), { id: 'c1', brief: {} });
    expect(emit).toHaveBeenCalledWith({ id: 'c1', brief: {} });
    expect(c().$deletingContactIDs()).toContain('c1');
  });

});
