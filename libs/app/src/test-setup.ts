import { TestBed } from '@angular/core/testing';
import { afterEach } from 'vitest';
import { setupTestEnvironment } from '@sneat/core/testing';

setupTestEnvironment();

// Each spec owns its injector; retained TestBed state must not cross tests.
afterEach(() => TestBed.resetTestingModule());
