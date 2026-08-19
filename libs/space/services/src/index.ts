export * from './lib/services/space-service.module';
export * from './lib/services/space-nav-service.interface';

/** @deprecated see the class's own JSDoc for the migration path. */
export * from './lib/services/space-nav.service';

export * from './lib/services/space.service';
export * from './lib/services/space-item.service';
export * from './lib/services/space-context.service';
export * from './lib/services/space-module.service';

/** @deprecated hard-depends on the deprecated `SpaceNavService`. */
export * from './lib/components/with-space-input.directive';

export * from './lib/guards/space-home-redirect.guard';
