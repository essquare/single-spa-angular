import { LifeCycles } from 'single-spa';
import { NgElement } from '@angular/elements';
import { getContainerElementAndSetTemplate } from '@essquare/single-spa-angular/internals';

import {
  BootstrappedSingleSpaAngularElementsOptions,
  Mutex,
  SingleSpaAngularElementOptions,
} from './types';
import { SingleSpaElementPropsService } from './element-props-providers';

const defaultOptions: BootstrappedSingleSpaAngularElementsOptions = {
  elements: new Map<string, NgElement>(),
  template: null!,
  ngModuleRef: null,
  bootstrapFunction: null!,
  parcelCanUpdate: true,
  domElementGetter: undefined,
  mutex: new Mutex(),
};

function setPropsService(options: BootstrappedSingleSpaAngularElementsOptions, props: any) {
  if (!options.ngModuleRef || typeof options.ngModuleRef.destroy !== 'function') {
    throw Error(
      `@essquare/single-spa-angular/elements: the options.ngModuleRef is not a valid Angular module. Did you call platformBrowserDynamic().bootstrapModule() correctly?`,
    );
  }

  const propsService: SingleSpaElementPropsService<any> | null = options.ngModuleRef.injector.get(
    SingleSpaElementPropsService,
    null,
  );
  if (propsService !== null) {
    propsService.setProps(props.name, props);
  }
}

async function bootstrap(options: BootstrappedSingleSpaAngularElementsOptions, props: any) {
  return await options.mutex.dispatch(async () => {
    if (options.ngModuleRef !== null) {
      return;
    }

    // We call `bootstrapFunction()` inside the bootstrap lifecycle hook
    // because Angular modules that expose custom elements should be
    // bootstrapped only once.
    options.ngModuleRef = await options.bootstrapFunction(props);
  });
}
async function mount(options: BootstrappedSingleSpaAngularElementsOptions, props: any) {
  const containerElement = getContainerElementAndSetTemplate(options, props);
  // `options.template` which can be `<app-element />` is not a valid selector
  // for `document.querySelector`, thus we retrieve this custom element
  // via this property.
  const element = containerElement.firstElementChild as NgElement;
  if (!element || !element.parentElement) {
    throw Error(
      `@essquare/single-spa-angular/elements: the element is not a valid Angular element or does not have a parent.`,
    );
  }
  options.elements.set(props.name, element);
  setPropsService(options, props);
}

function unmount(options: BootstrappedSingleSpaAngularElementsOptions, props: any): Promise<void> {
  return Promise.resolve().then(() => {
    // Removing custom element from DOM is enough since it will trigger
    // `disconnectedCallback()` and Angular will dispose all resources.
    if (!options.elements.has(props.name)) {
      throw Error(
        `@essquare/single-spa-angular/elements: the element is not a valid Angular element or does not have a parent.`,
      );
    }
    const element = options.elements.get(props.name);
    element!.parentElement!.removeChild(element!);
    options.elements.delete(props.name);
  });
}

async function update(
  options: BootstrappedSingleSpaAngularElementsOptions,
  props: any,
): Promise<void> {
  return Promise.resolve().then(() => {
    setPropsService(options, props);
  });
}

export function singleSpaAngularElements(userOptions: SingleSpaAngularElementOptions): LifeCycles {
  const options: BootstrappedSingleSpaAngularElementsOptions = {
    ...defaultOptions,
    ...userOptions,
  };

  const lifecycles: LifeCycles = {
    bootstrap: bootstrap.bind(null, options),
    mount: mount.bind(null, options),
    unmount: unmount.bind(null, options),
  };

  if (options.parcelCanUpdate) {
    lifecycles.update = update.bind(null, options);
  }

  return lifecycles;
}

export * from './element-props-providers';
