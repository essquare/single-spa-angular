import { join } from 'path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

const collectionPath = join(__dirname, '../../schematics.json');

export async function createWorkspace<WorkspaceOptions, AppOptions>(
  testRunner: SchematicTestRunner,
  appTree: UnitTestTree,
  workspaceOptions: WorkspaceOptions,
  appOptions: AppOptions,
) {
  appTree = await testRunner
    .runExternalSchematicAsync('@schematics/angular', 'workspace', workspaceOptions)
    .toPromise();

  appTree = await testRunner
    .runExternalSchematicAsync('@schematics/angular', 'application', appOptions, appTree)
    .toPromise();

  return appTree;
}

export function createTestRunner(): SchematicTestRunner {
  return new SchematicTestRunner('@essquare/single-spa-angular', collectionPath);
}
