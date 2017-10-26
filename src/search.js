import { Pool } from 'pg'
// import Cursor from 'pg-cursor'
import * as config from '../config'
import bluebird from 'bluebird'
import iso_3_2 from '../public/iso3_2'
const pool_schools = new Pool(config.db_schools)
const pool_countries = new Pool(config.db_countries)

// the pool with emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool_schools.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

// the pool with emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool_countries.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

exports.search = function(coordinates) {
  return new Promise((resolve, reject) => {
    pool_countries.connect((err, client, done) => {
      if (err) throw err
      client.query("select iso, name_0, name_1, name_2, name_3, name_4, name_5, ID_0, ID_1, ID_2, ID_3, ID_4, ID_5 from all_countries_one_table WHERE ST_Within (ST_Transform (ST_GeomFromText ('POINT(" + coordinates.lon + " " + coordinates.lat + ")',4326),4326), all_countries_one_table.geom);", [], (err, res) => {
        done()
        if (err) {
          console.log(err.stack)
        } else {
          if (res.rows.length < 1) {
            return resolve(
              {error: {message: 'No results'}}
            )
          }
          let enriched_record = add_admin_id(
                                  remove_pesky_quote(res)
                                )
          resolve(
            Object.assign(enriched_record, coordinates)
          )
        }
      })
    })
  })
}

function remove_pesky_quote(object) {
  return Object.keys(object.rows[0]).reduce((h, key) => {
    if (object.rows[0][key]) {
      h[key] = object.rows[0][key].replace(/('|\s+)/g, '');
    }
    return h
  }, {});
}

function add_admin_id(shape_obj){
  var iso = shape_obj.iso.toLowerCase();
  var ids = Object.keys(shape_obj).filter(k => {
    return k.match(/^ID_\d+/i);
  }).map(k => {
    return shape_obj[k]
  }).join('_')
  let admin_id = [iso, ids, 'gadm2-8'].join('_');
  shape_obj.admin_id = admin_id;
  return shape_obj;
}
