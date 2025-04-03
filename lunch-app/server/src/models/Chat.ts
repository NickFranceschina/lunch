import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { User } from "./User";
import { Group } from "./Group";

export enum ChatType {
    USER_TO_USER = 'user_to_user',
    GROUP = 'group'
}

@Entity()
export class Chat {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({
        type: 'varchar'
    })
    type!: ChatType;

    @ManyToOne(() => User)
    @JoinColumn()
    sender!: User;

    @Column()
    senderId!: number;

    // For user-to-user chat
    @ManyToOne(() => User, { nullable: true })
    @JoinColumn()
    recipient?: User;

    @Column({ nullable: true })
    recipientId?: number;

    // For group chat
    @ManyToOne(() => Group, { nullable: true })
    @JoinColumn()
    group?: Group;

    @Column({ nullable: true })
    groupId?: number;

    @Column()
    message!: string;

    @CreateDateColumn()
    sentAt!: Date;
} 