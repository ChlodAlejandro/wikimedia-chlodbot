/**
 *
 */
import sleep from "./sleep";

/**
 *
 */
export default abstract class Pool<Member> {

    /**
     * The pool of members. Mapped by Member:inUse
     */
    protected pool: Map<Member, boolean> = new Map();
    /**
     *
     */
    protected readonly poolMax = 4;

    abstract create(): Member | Promise<Member>;

    /**
     *
     */
    async generate(): Promise<Member> {
        const member = await this.create();
        this.pool.set( member, false );
        return member;
    }

    /**
     * Gets a single free member.
     */
    async getFree(): Promise<Member> {
        while ( true ) {
            for ( const member of this.pool.keys() ) {
                if ( !this.pool.get( member ) ) {
                    this.pool.set( member, true );
                    return member;
                }
            }

            if ( this.pool.size < this.poolMax ) {
                await this.generate();
            } else {
                await sleep( 5 );
            }
        }
    }

    /**
     * Sets a member free.
     *
     * @param member
     */
    setFree( member: Member ): void {
        this.pool.set( member, false );
    }

    /**
     *
     */
    async use( callback: ( member: Member ) => void ): Promise<void> {
        const member = await this.getFree();
        try {
            await callback( member );
        } finally {
            await this.setFree( member );
        }
    }

}
