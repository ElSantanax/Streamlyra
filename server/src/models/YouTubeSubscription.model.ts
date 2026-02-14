/**
 * Modelo de Suscripción de YouTube (PubSubHubbub)
 * Responsabilidad: Gestionar el ciclo de vida de las suscripciones a notificaciones de YouTube
 */

import { Table, Column, Model, DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';

interface YouTubeSubscriptionAttributes {
    id?: number;
    userId: string;
    channelId: string;
    topicUrl: string;
    callbackUrl: string;
    secret: string;
    status: string;
    expirationDate: Date | null;
    registeredAt: Date;
    lastNotificationAt: Date | null;
}

@Table({
    tableName: 'youtube_subscriptions',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            name: 'idx_youtube_subscriptions_channel_status',
            fields: ['channel_id', 'status']
        },
        {
            name: 'idx_youtube_subscriptions_user',
            fields: ['user_id']
        },
        {
            name: 'idx_youtube_subscriptions_expiration',
            fields: ['expiration_date']
        }
    ]
})
export class YouTubeSubscription extends Model<YouTubeSubscriptionAttributes> {
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
        field: 'channel_id'
    })
    declare channelId: string;

    @Column({
        type: DataType.STRING(500),
        allowNull: false,
        field: 'topic_url',
        comment: 'URL del feed XML del canal en YouTube'
    })
    declare topicUrl: string;

    @Column({
        type: DataType.STRING(500),
        allowNull: false,
        field: 'callback_url',
        comment: 'URL donde YouTube enviará las notificaciones'
    })
    declare callbackUrl: string;

    @Column({
        type: DataType.STRING(100),
        allowNull: false,
        comment: 'Secret para validar firma de notificaciones'
    })
    declare secret: string;

    @Column({
        type: DataType.STRING(50),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Estados: pending, verified, denied, expired'
    })
    declare status: string;

    @Column({
        type: DataType.DATE,
        allowNull: true,
        field: 'expiration_date',
        comment: 'Fecha de expiración de la suscripción (~5 días desde registro)'
    })
    declare expirationDate: Date | null;

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
        field: 'last_notification_at',
        comment: 'Última vez que se recibió una notificación'
    })
    declare lastNotificationAt: Date | null;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;
}
