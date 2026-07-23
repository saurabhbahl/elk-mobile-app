import { db } from "../index";

export type Movie = {
    id: string;
    title: string;
    releaseYear: string;
};

export const MovieRepository = {
    save(movie: Movie) {
        db.runSync(
            `
      INSERT OR REPLACE INTO movies
      (id, title, releaseYear)
      VALUES (?, ?, ?)
      `,
            [movie.id, movie.title, movie.releaseYear]
        );
    },

    saveMany(movies: Movie[]) {
        movies.forEach((movie) => {
            this.save(movie);
        });
    },

    getAll(): Movie[] {
        return db.getAllSync(`
      SELECT *
      FROM movies
      ORDER BY title
    `) as Movie[];
    },

    deleteAll() {
        db.runSync(`DELETE FROM movies`);
    },
};