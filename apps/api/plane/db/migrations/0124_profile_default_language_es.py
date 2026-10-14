# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0123_issueworklog"),
    ]

    operations = [
        migrations.AlterField(
            model_name="profile",
            name="language",
            field=models.CharField(default="es", max_length=255),
        ),
        migrations.RunSQL(
            sql="UPDATE profiles SET language = 'es' WHERE language IS DISTINCT FROM 'es';",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
