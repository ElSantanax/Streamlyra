/**
 * Modelo de Contexto de Stream de YouTube
 * Responsabilidad: Cachear información del stream activo para evitar consultas redundantes a la API
 */

import { Table, Column, Model, DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';

interface YouTubeStreamContextAttributes {
    id?: number;
    channelId: string;
    videoId: string;
    liveChatId: string;
    isActive: boolean;
    startedAt: Date;
    endedAt: Date | null;
}

@Table({
    tableName: 'youtube_stream_contexts',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            name: 'idx_youtube_stream_contexts_channel_active',
            fields: ['channel_id', 'is_active']
        },
        {
            name: 'idx_youtube_stream_contexts_video',
            fields: ['video_id']
        }
    ]
})
export class YouTubeStreamContext extends Model<YouTubeStreamContextAttributes> {
    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
        primaryKey: true
    })
    declare id?: number;

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
        field: 'channel_id',
        comment: 'ID del canal de YouTube'
    })
    declare channelId: string;

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
        field: 'video_id',
        comment: 'ID del video/stream en vivo'
    })
    declare videoId: string;

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
        field: 'live_chat_id',
        comment: 'ID del chat en vivo (se obtiene del video)'
    })
    declare liveChatId: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
        comment: 'Si el stream está actualmente en vivo'
    })
    declare isActive: boolean;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        field: 'started_at',
        comment: 'Momento en que comenzó el stream'
    })
    declare startedAt: Date;

    @Column({
        type: DataType.DATE,
        allowNull: true,
        field: 'ended_at',
        comment: 'Momento en que finalizó el stream'
    })
    declare endedAt: Date | null;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;
}
