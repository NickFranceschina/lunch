import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { User } from "./User";
import { Restaurant } from "./Restaurant";
import { GroupRestaurant } from "./GroupRestaurant";

@Entity()
export class Group {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true })
    name!: string;

    @Column({ nullable: true })
    description?: string;

    @Column({ type: 'time', nullable: true })
    notificationTime?: Date;

    @Column({ nullable: true })
    timezone?: string;

    @ManyToOne(() => Restaurant, { nullable: true })
    @JoinColumn()
    currentRestaurant?: Restaurant;

    @Column({ default: 0 })
    yesVotes!: number;

    @Column({ default: 0 })
    noVotes!: number;

    @Column({ default: false })
    isConfirmed!: boolean;

    @Column({ type: 'time', nullable: true })
    confirmationTime?: Date;

    @ManyToMany(() => User, user => user.groups)
    users!: User[];

    @OneToMany(() => GroupRestaurant, groupRestaurant => groupRestaurant.group)
    groupRestaurants!: GroupRestaurant[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
} 