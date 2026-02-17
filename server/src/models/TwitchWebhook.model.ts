/**
 * Modelo de Webhook de Twitch (EventSub)
 * Responsabilidad: Gestionar el ciclo de vida de las suscripciones a eventos de Twitch
 */

import { Table, Column, Model, DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';

interface TwitchWebhookAttributes {
    id?: number;
    userId: string;
    broadcasterId: string;
    subscriptionId: string | null;
    type: string;
    status: string;
    secret: string;
    callbackUrl: string;
    registeredAt: Date;
    lastEventAt: Date | null;
}

@Table({
    tableName: 'twitch_webhooks',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            name: 'idx_twitch_webhooks_broadcaster_type',
            fields: ['broadcaster_id', 'type', 'status']
        },
        {
            name: 'idx_twitch_webhooks_subscription',
            fields: ['subscription_id']
        },
        {
            name: 'idx_twitch_webhooks_user',
            fields: ['user_id']
        }
    ]
})
export class TwitchWebhook extends Model<TwitchWebhookAttributes> {
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
        type: DataType.STRING(255),
        allowNull: true,
        field: 'subscription_id'
    })
    declare subscriptionId: string | null;

    @Column({
        type: DataType.STRING(100),
        allowNull: false
    })
    declare type: string;

    @Column({
        type: DataType.STRING(50),
        allowNull: false,
        defaultValue: 'verification_pending'
    })
    declare status: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    declare secret: string;

    @Column({
        type: DataType.STRING(500),
        allowNull: false,
        field: 'callback_url'
    })
    declare callbackUrl: string;

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

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;
}
