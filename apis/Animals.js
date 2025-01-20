import { executeQuery } from '../services/SQLite.js'

(function () {
    executeQuery({
        "text": `
            CREATE TABLE IF NOT EXISTS animals (id INTEGER PRIMARY KEY AUTOINCREMENT, animal VARCHAR(255) UNIQUE, sound VARCHAR(255), icon VARCHAR(255) UNIQUE);
            INSERT OR REPLACE INTO animals(animal, sound, icon) VALUES 
            ('Alligator','Snap!','🐊'),
            ('Lion','Roaar!','🦁'),
            ('Cat','Meaow!','🐱');`
    })
})()

export default {
    insertAnimal({ animal, sound, icon }) {
        return executeQuery({
            text: "INSERT INTO animals(animal, sound, icon) VALUES ($1,$2,$3) RETURNING id;",
            values: [animal, sound, icon],
        });
    },
    deleteAnimal({ id }) {
        return executeQuery({
            text: "DELETE FROM animals WHERE id=$1;",
            values: [id],
        });
    },
    async getAnimals(id) {
        if (id)
            return executeQuery({
                text: "SELECT * FROM animals WHERE id=$1;",
                values: [id]
            });
        else {
            var result = await executeQuery({
                text: "SELECT * FROM animals;",
            });
            return result

        }
    }
};


