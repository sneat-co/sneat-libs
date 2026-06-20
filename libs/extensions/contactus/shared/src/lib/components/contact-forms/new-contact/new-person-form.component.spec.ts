import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CONTACT_GROUP_SERVICE, CONTACT_ROLE_SERVICE, CONTACT_SERVICE } from '@sneat/extension-contactus-contract';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';
import { SpaceNavService } from '@sneat/space-services';
import { of } from 'rxjs';
import { AssetService } from '../../../services/asset.service';

import { NewPersonFormComponent } from './new-person-form.component';

describe('NewPersonFormComponent', () => {
  let component: NewPersonFormComponent;
  let fixture: ComponentFixture<NewPersonFormComponent>;
  let assetServiceMock: { watchAssetByID: ReturnType<typeof vi.fn> };

  beforeEach(waitForAsync(async () => {
    assetServiceMock = { watchAssetByID: vi.fn(() => of(undefined)) };
    await TestBed.configureTestingModule({
      imports: [NewPersonFormComponent],
      providers: [
        { provide: ClassName, useValue: 'NewContactFormComponent' },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        {
          provide: SpaceNavService,
          useValue: {
            navigateForwardToSpacePage: vi.fn(() => Promise.resolve(true)),
          },
        },
        {
          provide: CONTACT_SERVICE,
          useValue: { createContact: vi.fn(), watchContactById: vi.fn() },
        },
        {
          provide: CONTACT_GROUP_SERVICE,
          useValue: { getContactGroupByID: vi.fn() },
        },
        {
          provide: CONTACT_ROLE_SERVICE,
          useValue: { getContactRoleByID: vi.fn() },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(NewPersonFormComponent, {
        set: {
          imports: [],
          template: '',
          providers: [{ provide: AssetService, useValue: assetServiceMock }],
        },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NewPersonFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.componentRef.setInput('$contact', {
      id: '',
      space: { id: 'test-space' },
      dbo: { type: 'person' },
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('watches the asset by id and stores the emitted asset context', () => {
    const space = { id: 'test-space' };
    const asset = {
      id: 'asset1',
      space,
      brief: { name: 'My car' },
      dbo: { name: 'My car' },
    };
    assetServiceMock.watchAssetByID.mockReturnValue(of(asset));

    fixture.componentRef.setInput('$assetID', 'asset1');
    fixture.detectChanges();

    expect(assetServiceMock.watchAssetByID).toHaveBeenCalledWith(
      space,
      'asset1',
    );
    expect(component.$asset()).toEqual(asset);
  });

  it('does not watch when no asset id is set', () => {
    expect(assetServiceMock.watchAssetByID).not.toHaveBeenCalled();
    expect(component.$asset()).toBeUndefined();
  });

  describe('submit', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = () => component as any;
    const contactSvc = () =>
      TestBed.inject(CONTACT_SERVICE) as unknown as {
        createContact: ReturnType<typeof vi.fn>;
      };

    it('throws when there is no space', () => {
      fixture.componentRef.setInput('$contact', {
        id: '',
        space: undefined,
        dbo: { type: 'person' },
      });
      fixture.detectChanges();
      expect(() => c().submit()).toThrow('Space is not defined');
    });

    it('creates a person contact and navigates on success', () => {
      contactSvc().createContact.mockReturnValue(of({ id: 'c1' }));
      c().submit();
      expect(contactSvc().createContact).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'test-space' }),
        expect.objectContaining({ type: 'person', spaceID: 'test-space' }),
      );
    });

    it('includes the related asset when an asset and relation are set', () => {
      contactSvc().createContact.mockReturnValue(of({ id: 'c1' }));
      c().$asset.set({
        id: 'a1',
        space: { id: 'test-space' },
        brief: { name: 'My car' },
      });
      c().assetRelation = 'owner';
      c().submit();
      expect(contactSvc().createContact).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          relatedToAssets: [
            expect.objectContaining({ id: 'a1', title: 'My car' }),
          ],
        }),
      );
    });

    it('adds the selected role to the request', () => {
      contactSvc().createContact.mockReturnValue(of({ id: 'c1' }));
      c().$selectedContactRole.set({ id: 'tenant' });
      c().submit();
      const request = contactSvc().createContact.mock.calls[0][1];
      expect(request.person.roles).toContain('tenant');
    });
  });
});
