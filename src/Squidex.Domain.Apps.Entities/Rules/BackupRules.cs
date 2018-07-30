﻿// ==========================================================================
//  Squidex Headless CMS
// ==========================================================================
//  Copyright (c) Squidex UG (haftungsbeschraenkt)
//  All rights reserved. Licensed under the MIT license.
// ==========================================================================

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Orleans;
using Squidex.Domain.Apps.Entities.Backup;
using Squidex.Domain.Apps.Entities.Rules.Indexes;
using Squidex.Domain.Apps.Entities.Rules.State;
using Squidex.Domain.Apps.Events.Rules;
using Squidex.Infrastructure;
using Squidex.Infrastructure.EventSourcing;
using Squidex.Infrastructure.States;
using Squidex.Infrastructure.Tasks;

namespace Squidex.Domain.Apps.Entities.Rules
{
    public sealed class BackupRules : BackupHandlerWithStore
    {
        private readonly HashSet<Guid> ruleIds = new HashSet<Guid>();
        private readonly IGrainFactory grainFactory;

        public BackupRules(IStore<Guid> store, IGrainFactory grainFactory)
            : base(store)
        {
            Guard.NotNull(grainFactory, nameof(grainFactory));

            this.grainFactory = grainFactory;
        }

        public override async Task RemoveAsync(Guid appId)
        {
            var index = grainFactory.GetGrain<IRulesByAppIndex>(appId);

            var idsToRemove = await grainFactory.GetGrain<IRulesByAppIndex>(appId).GetRuleIdsAsync();

            foreach (var ruleId in idsToRemove)
            {
                await RemoveSnapshotAsync<RuleState>(ruleId);
            }

            await index.ClearAsync();
        }

        public override Task RestoreEventAsync(Envelope<IEvent> @event, Guid appId, BackupReader reader)
        {
            switch (@event.Payload)
            {
                case RuleCreated ruleCreated:
                    ruleIds.Add(ruleCreated.RuleId);
                    break;
                case RuleDeleted ruleDeleted:
                    ruleIds.Remove(ruleDeleted.RuleId);
                    break;
            }

            return TaskHelper.Done;
        }

        public async override Task RestoreAsync(Guid appId, BackupReader reader)
        {
            await RebuildManyAsync(ruleIds, id => RebuildAsync<RuleState, RuleGrain>(id, (e, s) => s.Apply(e)));

            await grainFactory.GetGrain<IRulesByAppIndex>(appId).RebuildAsync(ruleIds);
        }
    }
}