/**
 * Modelo de Webhook de Kick
 * Responsabilidad: Trackear webhooks registrados en Kick para prevenir duplicados
 */

import { Table, Column, Model, DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';

interface KickWebhookAttributes {
    id?: number;
    userId: string;
    broadcasterId: string;
    callbackUrl: string;
    isActive: boolean;
    registeredAt: Date;
    lastEventAt: Date | null;
    deactivatedAt: Date | null;
}

@Table({
    tableName: 'kick_webhooks',
    timestamps: true,
    underscored: true
})
export class KickWebhook extends Model<KickWebhookAttributes> {
    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
        primaryKey: true
    })
    declare id?: number;

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
        field: 'user_id'
    })
    declare userId: string;

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
        field: 'broadcaster_id'
    })
    declare broadcasterId: string;

    @Column({
        type: DataType.STRING(500),
        allowNull: false,
        field: 'callback_url'
    })
    declare callbackUrl: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active'
    })
    declare isActive: boolean;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW,
        field: 'registered_at'
    })
    declare registeredAt: Date;

    @Column({
        type: DataType.DATE,
        allowNull: true,
        field: 'last_event_at'
    })
    declare lastEventAt: Date | null;

    @Column({
        type: DataType.DATE,
        allowNull: true,
        field: 'deactivated_at'
    })
    declare deactivatedAt: Date | null;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;
}
