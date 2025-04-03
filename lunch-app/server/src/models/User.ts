import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Group } from "./Group";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true })
    username!: string;

    @Column()
    password!: string; // Will be hashed before storage

    @Column({ default: false })
    isAdmin!: boolean;

    @Column({ nullable: true })
    ipAddress?: string;

    @Column({ nullable: true })
    port?: number;

    @Column({ default: false })
    isLoggedIn!: boolean;

    @ManyToMany(() => Group, (group: Group) => group.users)
    @JoinTable()
    groups!: Group[];

    @Column({ nullable: true })
    currentGroupId?: number;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
} 