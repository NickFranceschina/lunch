import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Group } from "./Group";
import { Restaurant } from "./Restaurant";

// Define the enum locally to avoid circular dependencies
export enum OccurrenceRating {
    SELDOM = 'seldom',
    SOMETIMES = 'sometimes',
    OFTEN = 'often'
}

@Entity()
export class GroupRestaurant {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Group, group => group.groupRestaurants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'groupId' })
    group!: Group;

    @Column()
    groupId!: number;

    @ManyToOne(() => Restaurant, restaurant => restaurant.groupRestaurants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'restaurantId' })
    restaurant!: Restaurant;

    @Column()
    restaurantId!: number;

    @Column({
        type: 'varchar',
        default: OccurrenceRating.SOMETIMES
    })
    occurrenceRating!: OccurrenceRating;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
} 