import 'multer'
import * as fs from 'fs'
import { Injectable, NotFoundException } from '@nestjs/common'
import * as shortid from 'shortid'
import * as hash from 'hash.js'
import { User, UserAddData, UserUpdateData, UserREST } from 'productboard-common'
import { MemberService } from '../members/member.service'
import { Like, Repository } from 'typeorm'
import { UserEntity } from './user.entity'
import { InjectRepository } from '@nestjs/typeorm'

@Injectable()
export class UserService implements UserREST<UserAddData, Express.Multer.File> {
    private static readonly users: User[] = [
        { id: 'demo-1', name: 'Georg Hackenberg', email: 'georg.hackenberg@fh-wels.at', password: hash.sha256().update('test').digest('hex'), pictureId: 'demo-1', deleted: false},
        { id: 'demo-2', name: 'Christian Zehetner', email: 'christian.zehetner@fh-wels.at', password: hash.sha256().update('test').digest('hex'), pictureId: 'demo-2', deleted: false },
        { id: 'demo-3', name: 'Jürgen Humenberger', email: 'juergen.humenberger@fh-wels.at', password: hash.sha256().update('test').digest('hex'), pictureId: 'demo-3', deleted: false },
        { id: 'demo-4', name: 'Dominik Frühwirth', email: 'dominik.fruehwirth@fh-wels.at', password: hash.sha256().update('test').digest('hex'), pictureId: 'demo-4', deleted: false }
    ]

    constructor(
        private readonly memberService: MemberService,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository <UserEntity>
    ) {
        this.userRepository.count().then(async count => {
            if (count == 0) {
                for (const user of UserService.users) {
                    await this.userRepository.save(user)
                }
            }
        })
    }

    async checkUser(): Promise<User> {
        return null
    }

    async findUsers(query?: string, productId?: string) : Promise<User[]> {
        const results: User[] = []
        const options = query ? { deleted: false, name: Like(`%${query}%`) } : { deleted: false }
        for (const user of await this.userRepository.find(options)) {
            if (productId && (await this.memberService.findMembers(productId, user.id)).length > 0) {
                continue
            }
            results.push(user)
        }
        return results
    }

    async addUser(data: UserAddData, file?: Express.Multer.File) {
        const user = { id: shortid(), deleted: false, pictureId: shortid(), ...data }
        if (file && file.originalname.endsWith('.jpg')) {
            if (!fs.existsSync('./uploads')) {
                fs.mkdirSync('./uploads')
            }
            fs.writeFileSync(`./uploads/${user.pictureId}.jpg`, file.buffer)
        }
        return this.userRepository.save(user)
    }

    async getUser(id: string): Promise<User> {
        const user = await this.userRepository.findOne(id)
        if (user) {
            return user
        }
        throw new NotFoundException()
    }

    async updateUser(id: string, data: UserUpdateData, file?: Express.Multer.File): Promise<User> {
        const user = await this.userRepository.findOne(id)
        if (user) {
            user.email = data.email
            user.password = data.password
            user.name = data.name
            if (file && file.originalname.endsWith('.jpg')) {
                user.pictureId = shortid()
                if (!fs.existsSync('./uploads')) {
                    fs.mkdirSync('./uploads')
                }
                fs.writeFileSync(`./uploads/${user.pictureId}.jpg`, file.buffer)
            }
            return this.userRepository.save(user)
        }
        throw new NotFoundException()
    }

    async deleteUser(id: string): Promise<User> {
        const user = await this.userRepository.findOne(id)
        if (user) {
            user.deleted = true
            return this.userRepository.save(user)
        }
        throw new NotFoundException()
    }
}