/**
 * Modelo de Cuota de YouTube
 * Responsabilidad: Persistir el consumo diario de la API de YouTube para sobrevivir reinicios
 */

import { Table, Column, Model, DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';

interface YouTubeQuotaAttributes {
    date: string; // Formato: YYYY-MM-DD
    unitsUsed: number;
    isExhausted: boolean;
    exhaustedUntil: Date | null;
    lastReset: Date;
}

@Table({
    tableName: 'youtube_quotas',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            name: 'idx_youtube_quotas_date',
            unique: true,
            fields: ['date']
        }
    ]
})
export class YouTubeQuota extends Model<YouTubeQuotaAttributes> {
    @Column({
        type: DataType.STRING(10),
        primaryKey: true,
        comment: 'Fecha en formato YYYY-MM-DD (Hora Pacífico)'
    })
    declare date: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'units_used',
        comment: 'Unidades consumidas en el día'
    })
    declare unitsUsed: number;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_exhausted',
        comment: 'Si la cuota está agotada o se alcanzó rate limit'
    })
    declare isExhausted: boolean;

    @Column({
        type: DataType.DATE,
        allowNull: true,
        field: 'exhausted_until',
        comment: 'Timestamp hasta cuando está bloqueada la cuota'
    })
    declare exhaustedUntil: Date | null;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW,
        field: 'last_reset',
        comment: 'Última vez que se reseteó el contador'
    })
    declare lastReset: Date;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;
}
