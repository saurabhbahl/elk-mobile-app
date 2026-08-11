export type Coordinate = {
  latitude: number;
  longitude: number;
};

export interface Waypoint {
  id: number;
  coordinate: Coordinate;
  title: string;
  description: string;
  full_description?: string;
  address?: string;
  featured_image?: Record<string, unknown> | boolean;
  image_gallery?: unknown[];
  handicap_accessible?: boolean | number | string;
  open_year_round?: boolean | number | string;
  seasonal_notes?: string;
  external_link?: string;
  pin_icon_override?: Record<string, unknown> | boolean;
}

// export const waypoints: Waypoint[] = [
//   {
//     id: 1,
//     coordinate: { latitude: 41.11601224723354, longitude: -78.52400676232403 },
//     title: 'S.B. Elliott State Park',
//     address: '2112 Old Route 153, Penfield, PA 15849',
//     pin_popup_summary: 'A quiet wooded park with hiking, picnicking, and rustic cabins.',
//     full_description:
//       'S.B. Elliott State Park is a small, peaceful park surrounded by forest. Visitors can enjoy short hikes, have a picnic, or stay overnight in a rustic cabin.'
//   },
//   {
//     id: 2,
//     coordinate: { latitude: 41.203569028195716, longitude: -78.50082818408791 },
//     title: 'Parker Dam State Park',
//     address: '28 Fairview Road, Penfield, PA 15849',
//     pin_popup_summary: 'A scenic state park with a lake, trails, cabins, and abundant wildlife.',
//     full_description:
//       'Parker Dam State Park features a scenic lake surrounded by forest. Visitors can hike, fish, picnic, swim, camp, and explore the nearby Moshannon State Forest.'
//   },
//   {
//     id: 3,
//     coordinate: { latitude: 41.2745823150544, longitude: -78.29063643513553 },
//     title: 'Marion Brooks Natural Area',
//     address: 'Quehanna Highway, Benezette, PA 15821',
//     pin_popup_summary: 'A beautiful natural area known for its large stand of white birch trees.',
//     full_description:
//       'Marion Brooks Natural Area protects a large stand of white birch trees along the Quehanna Highway. Visitors can explore the forest and look for wildlife and birds.'
//   },
//   {
//     id: 4,
//     coordinate: { latitude: 41.262089466071885, longitude: -78.25830604467583 },
//     title: 'Beaver Run Dam Viewing Area',
//     address: 'Quehanna Highway, Benezette, PA 15821',
//     pin_popup_summary: 'A quiet wildlife viewing spot near Beaver Run.',
//     full_description:
//       'Beaver Run Dam Viewing Area provides a short trail and a wildlife viewing area near the Quehanna Highway. The surrounding wetlands and forest attract many birds and other wildlife.'
//   },
//   {
//     id: 5,
//     coordinate: { latitude: 41.22910217002885, longitude: -78.19136018336509 },
//     title: 'Hoover Farm Viewing Area',
//     address: 'Wykoff Run Road & Quehanna Highway, Benezette, PA 15821',
//     pin_popup_summary: 'A popular wildlife viewing area where elk and other animals gather.',
//     full_description:
//       'Hoover Farm has an accessible viewing blind overlooking wildlife food plots. Elk are commonly seen here, along with deer, wild turkeys, foxes, and birds.'
//   },
//   {
//     id: 6,
//     coordinate: { latitude: 41.23122243361177, longitude: -78.19167450159732 },
//     title: 'Wyckoff Run Natural Area',
//     address: 'Wykoff Run Road, Benezette, PA 15821',
//     pin_popup_summary: 'A forested natural area known for wildlife, birds, and quiet trails.',
//     full_description:
//       'Wyckoff Run Natural Area protects a large forested area with habitat for many birds and other wildlife. The Old Hoover Trail passes through the area.'
//   },
//   {
//     id: 7,
//     coordinate: { latitude: 41.34185363316541, longitude: -78.36812624789334 },
//     title: 'Winslow Hill Viewing Area',
//     address: 'Winslow Hill Road, Benezette, PA 15821',
//     pin_popup_summary: 'One of Pennsylvania’s best-known spots for watching elk.',
//     full_description:
//       'Winslow Hill Viewing Area overlooks open meadows that attract elk and other wildlife. Early morning and evening are popular times for wildlife viewing.'
//   },
//   {
//     id: 8,
//     coordinate: { latitude: 41.34608984365709, longitude: -78.3468193745491 },
//     title: "Dent's Run Viewing Area",
//     address: 'Winslow Hill Road, Benezette, PA 15821',
//     pin_popup_summary: 'A scenic overlook with excellent opportunities to see elk and wildlife.',
//     full_description:
//       'Dents Run Viewing Area offers wide views of open fields surrounded by forest. Elk are commonly seen here, especially during the morning and evening.'
//   },
//   {
//     id: 9,
//     coordinate: { latitude: 41.36113527056216, longitude: -78.32069820755413 },
//     title: 'Pine Tree Trail Natural Area',
//     address: 'West Hicks Run Road, Benezette, PA 15832',
//     pin_popup_summary: 'A historic trail leading to a large stand of white pine trees.',
//     full_description:
//       'Pine Tree Trail is a self-guided interpretive trail through Elk State Forest. The trail leads to a large stand of white pine and passes remains of an old homestead.'
//   },
//   {
//     id: 10,
//     coordinate: { latitude: 41.39434245517357, longitude: -78.28294584462267 },
//     title: 'Thunder Mtn. Equestrian Trail',
//     address: 'East Hicks Run Road, Benezette, PA 15821',
//     pin_popup_summary: 'A large trail system offering horseback riding and forest views.',
//     full_description:
//       'Thunder Mountain Equestrian Trail includes about 53 miles of designated trails and roads through Elk State Forest. It is popular with horseback riders and outdoor enthusiasts.'
//   },
//   {
//     id: 11,
//     coordinate: { latitude: 41.36301706320921, longitude: -78.24736568225684 },
//     title: 'Hicks Run Wildlife Viewing Area',
//     address: 'Hicks Run Road, Benezette, PA 15821',
//     pin_popup_summary: 'An accessible wildlife blind overlooking fields where elk often feed.',
//     full_description:
//       'Hicks Run Wildlife Viewing Area features a covered viewing blind overlooking wildlife food plots. Elk and other wildlife can often be seen from the area.'
//   },
//   {
//     id: 12,
//     coordinate: { latitude: 41.32626640629507, longitude: -78.11596020545255 },
//     title: 'Bucktail Path/Johnson Run Natural Area',
//     address: 'Elk State Forest Route 120, Driftwood, PA 15832',
//     pin_popup_summary: 'A rugged forest area with old-growth trees and steep mountain terrain.',
//     full_description:
//       'Johnson Run Natural Area protects a rugged landscape with steep valleys, streams, boulders, and old-growth hemlock and hardwood forest.'
//   },
//   {
//     id: 13,
//     coordinate: { latitude: 41.28278403212881, longitude: -78.09073690503848 },
//     title: 'Lower Jerry Run Natural Area',
//     address: 'Elk State Forest, Sinnemahoning, PA 15861',
//     pin_popup_summary: 'A remote natural area known for old-growth pine and hemlock forest.',
//     full_description:
//       'Lower Jerry Run Natural Area protects an old-growth forest of pine and hemlock. The area is remote and best suited for visitors prepared for backcountry hiking.'
//   },
//   {
//     id: 14,
//     coordinate: { latitude: 41.47674758301308, longitude: -78.05649766071 },
//     title: 'Sinnemahoning State Park Viewing Area',
//     address: '4843 Park Road, Austin, PA 16720',
//     pin_popup_summary: 'A wildlife viewing area where visitors can look for elk, deer, and eagles.',
//     full_description:
//       'The viewing area at Sinnemahoning State Park overlooks open habitat near the creek. Visitors may see elk, white-tailed deer, bald eagles, and other wildlife.'
//   },
//   {
//     id: 15,
//     coordinate: { latitude: 41.376320041824975, longitude: -77.93213487940838 },
//     title: 'Kettle Creek State Park',
//     address: '97 Kettle Creek Park Lane, Renovo, PA 17764',
//     pin_popup_summary: 'A mountain park with a large reservoir, fishing, hiking, and wildlife.',
//     full_description:
//       'Kettle Creek State Park is surrounded by mountains and forest. The park offers fishing, boating, hiking, camping, swimming, picnicking, and wildlife viewing.'
//   },
//   {
//     id: 16,
//     coordinate: { latitude: 41.253862769958985, longitude: -77.72546860435533 },
//     title: 'Cranberry Swamp Natural Area',
//     address: 'Chuck Keiper Trail, Renovo, PA 17764',
//     pin_popup_summary: 'A mountain bog surrounded by forest and rich wetland habitat.',
//     full_description:
//       'Cranberry Swamp Natural Area protects a 144-acre mountain bog along the Chuck Keiper Trail. The wetland provides habitat for birds, butterflies, and many native plants.'
//   },
//   {
//     id: 17,
//     coordinate: { latitude: 41.23316904127265, longitude: -77.77456368400671 },
//     title: 'East Branch Swamp Natural Area',
//     address: 'PA Route 144, Renovo, PA 17764',
//     pin_popup_summary: 'A diverse wetland and forest area with excellent bird habitat.',
//     full_description:
//       'East Branch Swamp Natural Area is located along Route 144 and forms part of the Chuck Keiper Trail system. Its varied forest and wetland habitats support many birds and other wildlife.'
//   },
//   {
//     id: 18,
//     coordinate: { latitude: 41.23743319701814, longitude: -77.78590435027826 },
//     title: 'Fish Dam Run Scenic View',
//     address: 'PA Route 144, Renovo, PA 17764',
//     pin_popup_summary: 'A scenic overlook with wide views of the surrounding forest.',
//     full_description:
//       'Fish Dam Run Scenic View provides an elevated view across the forested landscape of Sproul State Forest. It is a peaceful roadside stop for enjoying mountain and valley scenery.'
//   },
//   {
//     id: 19,
//     coordinate: { latitude: 41.18927014926793, longitude: -77.85212030610056 },
//     title: 'Two Rock Run Scenic View',
//     address: 'PA Route 144, Renovo, PA 17764',
//     pin_popup_summary: 'A scenic area showing how the forest has recovered after a major wildfire.',
//     full_description:
//       'Two Rock Run was affected by a major wildfire in 1990. Today, visitors can observe the natural regeneration of the forest and enjoy short walks to scenic viewpoints.'
//   },
//   {
//     id: 20,
//     coordinate: { latitude: 41.17903395036177, longitude: -77.93798398192969 },
//     title: 'Fields Ridge Rd Overlook',
//     address: 'Fields Ridge Road, Renovo, PA 17764',
//     pin_popup_summary: 'A high ridge overlook with views across the West Branch Susquehanna valley.',
//     full_description:
//       'Fields Ridge Road Overlook provides elevated views across the forest and the West Branch of the Susquehanna River. The ridge is also a good place to watch soaring birds.'
//   },
//   {
//     id: 21,
//     coordinate: { latitude: 41.16184794307325, longitude: -77.89771115587743 },
//     title: 'State Game Lands 100',
//     address: 'State Game Lands 100, Renovo, PA 17764',
//     pin_popup_summary: 'A large wildlife area with forests and habitat for many species.',
//     full_description:
//       'State Game Lands 100 provides protected forest and wildlife habitat. Visitors can explore the area and look for birds and other wildlife, especially during quieter morning and evening hours.'
//   },
//   {
//     id: 22,
//     coordinate: { latitude: 41.07198079448926, longitude: -77.99653652313985 },
//     title: 'German Settlement Reclamation',
//     address: 'State Game Lands, Renovo, PA 17764',
//     pin_popup_summary: 'Reclaimed former mining land that now provides important wildlife habitat.',
//     full_description:
//       'This reclaimed landscape demonstrates how former mining land can recover into useful wildlife habitat. Open grasslands and old apple trees attract birds, deer, and other animals.'
//   },
//   {
//     id: 23,
//     coordinate: { latitude: 41.11104092013783, longitude: -78.10997639275506 },
//     title: 'Karthaus Canoe Launch',
//     address: 'Karthaus, PA 16845',
//     pin_popup_summary: 'A river access point for paddling the scenic West Branch Susquehanna River.',
//     full_description:
//       'Karthaus Canoe Launch provides access to the West Branch Susquehanna River. It is a useful starting point for paddlers exploring the scenic and remote river corridor.'
//   },
//   {
//     id: 24,
//     coordinate: { latitude: 31.30851700123502, longitude: 75.5665335857824 },
//     title: 'Custom Start Point',
//     address: 'Custom location',
//     pin_popup_summary: 'The starting point for a custom offline route.',
//     full_description:
//       'This point marks the starting location for a custom offline route generated by the application.'
//   },
//   {
//     id: 25,
//     coordinate: { latitude: 31.307576157262805, longitude: 75.57061974516645 },
//     title: 'Custom Destination',
//     address: 'Custom location',
//     pin_popup_summary: 'The destination point for a custom offline route.',
//     full_description:
//       'This point marks the destination location for a custom offline route generated by the application.'
//   },
// ];
