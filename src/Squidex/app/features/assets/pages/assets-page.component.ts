/*
 * Squidex Headless CMS
 *
 * @license
 * Copyright (c) Sebastian Stehle. All rights reserved
 */

// tslint:disable:prefer-for-of

import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';

import {
    AppComponentBase,
    AppsStoreService,
    AssetDto,
    AssetsService,
    fadeAnimation,
    ImmutableArray,
    NotificationService,
    Pager,
    UsersProviderService
} from 'shared';

@Component({
    selector: 'sqx-assets-page',
    styleUrls: ['./assets-page.component.scss'],
    templateUrl: './assets-page.component.html',
    animations: [
        fadeAnimation
    ]
})
export class AssetsPageComponent extends AppComponentBase implements OnInit {
    public newFiles = ImmutableArray.empty<File>();

    public assetsItems = ImmutableArray.empty<AssetDto>();
    public assetsPager = new Pager(0, 0, 12);
    public assetsFilter = new FormControl();
    public assertQuery = '';

    constructor(apps: AppsStoreService, notifications: NotificationService, users: UsersProviderService,
        private readonly assetsService: AssetsService
    ) {
        super(notifications, users, apps);
    }

    public ngOnInit() {
        this.load();
    }

    public search() {
        this.assetsPager = new Pager(0, 0, 12);
        this.assertQuery = this.assetsFilter.value;

        this.load();
    }

    private load() {
        this.appName()
            .switchMap(app => this.assetsService.getAssets(app, this.assetsPager.pageSize, this.assetsPager.skip, this.assertQuery, null))
            .subscribe(dtos => {
                this.assetsItems = ImmutableArray.of(dtos.items);
                this.assetsPager = this.assetsPager.setCount(dtos.total);
            }, error => {
                this.notifyError(error);
            });
    }

    public onAssetDeleting(asset: AssetDto) {
        this.appName()
            .switchMap(app => this.assetsService.deleteAsset(app, asset.id, asset.version))
            .subscribe(dtos => {
                this.assetsItems = this.assetsItems.filter(x => x.id !== asset.id);
                this.assetsPager = this.assetsPager.decrementCount();
            }, error => {
                this.notifyError(error);
            });
    }

    public onAssetLoaded(file: File, asset: AssetDto) {
        this.newFiles = this.newFiles.remove(file);

        this.assetsItems = this.assetsItems.pushFront(asset);
        this.assetsPager = this.assetsPager.incrementCount();
    }

    public onAssetFailed(file: File) {
        this.newFiles = this.newFiles.remove(file);
    }

    public goNext() {
        this.assetsPager = this.assetsPager.goNext();

        this.load();
    }

    public goPrev() {
        this.assetsPager = this.assetsPager.goPrev();

        this.load();
    }

    public addFiles(files: FileList) {
        for (let i = 0; i < files.length; i++) {
            this.newFiles = this.newFiles.pushFront(files[i]);
        }
    }
}
