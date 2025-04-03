import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { Group } from "./Group";
import { GroupRestaurant } from "./GroupRestaurant";

export enum OccurrenceRating {
    SELDOM = 'seldom',
    SOMETIMES = 'sometimes',
    OFTEN = 'often'
}

@Entity()
export class Restaurant {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true })
    name!: string;

    @Column({ nullable: true })
    description?: string;

    @Column({ nullable: true })
    address?: string;

    @Column({ nullable: true })
    phone?: string;

    @Column({ nullable: true })
    website?: string;

    @OneToMany(() => GroupRestaurant, groupRestaurant => groupRestaurant.restaurant)
    groupRestaurants!: GroupRestaurant[];

    @Column({ default: false })
    hasBeenSelected!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
} 