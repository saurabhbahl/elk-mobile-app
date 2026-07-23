export type Coordinate = {
  latitude: number;
  longitude: number;
};

export interface Waypoint {
  id: number;
  coordinate: Coordinate;
  title: string;
  description: string;
}

export const waypoints: Waypoint[] = [
  {
    id: 1,
    coordinate: { latitude: 41.11601224723354, longitude: -78.52400676232403 },
    title: 'S.B. Elliott State Park',
    description: 'Take a quick hike, enjoy a picnic lunch or stay overnight in a rustic CCC-era cabin in this small wooded park.'
  },
  {
    id: 2,
    coordinate: { latitude: 41.203569028195716, longitude: -78.50082818408791 },
    title: 'Parker Dam State Park',
    description: 'Watch for black swallowtail butterflies in wildflowers at edge of Parker Lake or the occasional osprey or bald eagle overhead. Walk Beaver Dam Trail to experience varied habitat types and look for sturdy beaver huts.'
  },
  {
    id: 3,
    coordinate: { latitude: 41.2745823150544, longitude: -78.29063643513553 },
    title: 'Marion Brooks Natural Area',
    description: 'This area is best known for its stand of white birches. In late July, blueberries and huckleberries abound here, a favorite of bears and hungry hikers. Listen for wood peckers and eastern towhee.'
  },
  {
    id: 4,
    coordinate: { latitude: 41.262089466071885, longitude: -78.25830604467583 },
    title: 'Beaver Run Dam Viewing Area',
    description: 'Walk the short trail to a viewing blind and look for cavity-nesting wood ducks and hooded mergansers. Smaller nest boxes house eastern bluebirds and tree swallows. You may also see great blue heron fishing by the shore.'
  },
  {
    id: 5,
    coordinate: { latitude: 41.22910217002885, longitude: -78.19136018336509 },
    title: 'Hoover Farm Viewing Area',
    description: 'Take the short trail to a viewing blind and look for elk, white-tailed deer, wild turkeys, and grassland birds. A longer 5-mile hike option also loops around the viewing area.'
  },
  {
    id: 6,
    coordinate: { latitude: 41.23122243361177, longitude: -78.19167450159732 },
    title: 'Wyckoff Run Natural Area',
    description: 'Birds, birds, and more birds! At this Audubon Important Bird Area, hikers and cross-country skiers can spot a wide variety of species while exploring the Old Hoover Trail that bisects the natural area.'
  },
  {
    id: 7,
    coordinate: { latitude: 41.34185363316541, longitude: -78.36812624789334 },
    title: 'Winslow Hill Viewing Area',
    description: 'Once strip-mined, this reclaimed site provides good elk viewing with more parking off Dewey Road. About 1/4 mile further on Winslow Hill Road, look for the Woodring Farm Trail, a 3/4 mile walking path to another viewing area.'
  },
  {
    id: 8,
    coordinate: { latitude: 41.34608984365709, longitude: -78.3468193745491 },
    title: "Dent's Run Viewing Area",
    description: 'Enjoy panoramic views of grazing fields to the north and east. At dawn and dusk watch for elk, white-tailed deer, wild turkeys or red foxes that may be hunting rodents.'
  },
  {
    id: 9,
    coordinate: { latitude: 41.36113527056216, longitude: -78.32069820755413 },
    title: 'Pine Tree Trail Natural Area',
    description: 'The trail leads to a 12-acre white pine stand that sprouted in farm fields in the 1800s. As you walk beneath the giant pines listen for black-throated green warblers calling overhead.'
  },
  {
    id: 10,
    coordinate: { latitude: 41.39434245517357, longitude: -78.28294584462267 },
    title: 'Thunder Mtn. Equestrian Trail',
    description: 'The trail consists of 53 miles of roads and trails in various loops. You will have a good chance of spotting elk far from busier viewing sites. Hick’s Run is also excellent for trout fishing.'
  },
  {
    id: 11,
    coordinate: { latitude: 41.36301706320921, longitude: -78.24736568225684 },
    title: 'Hicks Run Wildlife Viewing Area',
    description: 'This is one of the premier elk viewing areas along the drive, with a handicap accessible viewing blind that provides incredible views and wildlife photo opportunities.'
  },
  {
    id: 12,
    coordinate: { latitude: 41.32626640629507, longitude: -78.11596020545255 },
    title: 'Bucktail Path/Johnson Run Natural Area',
    description: 'The rugged trail follows a private road up the mountain. From the ridge top you can see old growth hemlocks and pines growing on the steep slopes far down in Johnson Run.'
  },
  {
    id: 13,
    coordinate: { latitude: 41.28278403212881, longitude: -78.09073690503848 },
    title: 'Lower Jerry Run Natural Area',
    description: 'Immerse yourself in the wilderness at Lower Jerry Run Natural Area, where old-growth hemlocks more than 300 years old tower 120 feet toward the sky. Watch for rattlesnakes along the trail.'
  },
  {
    id: 14,
    coordinate: { latitude: 41.47674758301308, longitude: -78.05649766071 },
    title: 'Sinnemahoning State Park Viewing Area',
    description: 'The site is at the north end of the park, just 1/4 mile from the Wildlife Center. A viewing blind offers opportunities to observe white-tailed deer, elk, and eagles in the fields along Sinnemahoning Creek and the Lowlands Trail.'
  },
  {
    id: 15,
    coordinate: { latitude: 41.376320041824975, longitude: -77.93213487940838 },
    title: 'Kettle Creek State Park',
    description: 'The Alvin R. Bush Dam creates the 167-acre Kettle Creek Reservoir, a stocked trout lake that is irresistible to anglers. The park’s wide variety of habitats offer multiple wildlife viewing opportunities.'
  },
  {
    id: 16,
    coordinate: { latitude: 41.253862769958985, longitude: -77.72546860435533 },
    title: 'Cranberry Swamp Natural Area',
    description: 'At the headwaters of Cranberry Run, this open wetland is filled with rushes, sedges, and grasses surrounded by forests. It is home to swamp sparrows and common yellowthroats. When blooming, steeple bush attracts many butterflies.'
  },
  {
    id: 17,
    coordinate: { latitude: 41.23316904127265, longitude: -77.77456368400671 },
    title: 'East Branch Swamp Natural Area',
    description: 'Early 20th-century loggers, followed by fires and a tornado, felled many trees here. It created a broad range of habitats in which wildlife abounds, including an amazing variety of wood warblers.'
  },
  {
    id: 18,
    coordinate: { latitude: 41.23743319701814, longitude: -77.78590435027826 },
    title: 'Fish Dam Run Scenic View',
    description: 'This ridgetop vista provides impressive views westward. It is a good place to look for red-tailed hawks and American kestrels. Watch for chipping sparrows along the roadside and parking area.'
  },
  {
    id: 19,
    coordinate: { latitude: 41.18927014926793, longitude: -77.85212030610056 },
    title: 'Two Rock Run Scenic View',
    description: 'In 1990, fire killed 90 percent of the trees over 10,000 acres here. Observe natural regeneration at work. Walk two short trails to scenic viewing areas.'
  },
  {
    id: 20,
    coordinate: { latitude: 41.17903395036177, longitude: -77.93798398192969 },
    title: 'Fields Ridge Rd Overlook',
    description: 'Hot air rises along these steep slopes. It provides thermals for turkey vultures, broad-winged hawks, and other raptors to soar above the West Branch of the Susquehanna River below.'
  },
  {
    id: 21,
    coordinate: { latitude: 41.16184794307325, longitude: -77.89771115587743 },
    title: 'State Game Lands 100',
    description: 'Dawn and dusk are the best times to look and listen for the forest’s resident owls. Both barred and great-horned owls perch here, waiting for prey to stir.'
  },
  {
    id: 22,
    coordinate: { latitude: 41.07198079448926, longitude: -77.99653652313985 },
    title: 'German Settlement Reclamation',
    description: 'Reclaimed after strip mining these grasslands are habitat for golden-winged warblers and many bird species. Wild apple trees, remnants of early German Settlements, attract white-tailed deer and ruffed grouse.'
  },
  {
    id: 23,
    coordinate: { latitude: 41.11104092013783, longitude: -78.10997639275506 },
    title: 'Karthaus Canoe Launch',
    description: 'Just upstream from the old green suspension bridge at Karthaus, this launch gives paddlers access to the West Branch Susquehanna River Water Trail, and some of the most remote paddling in the state.'
  },
  {
    id: 24,
    coordinate: { latitude: 31.30851700123502, longitude: 75.5665335857824 },
    title: 'Custom Start Point',
    description: 'Starting point for the specific offline route generated.'
  },
  {
    id: 25,
    coordinate: { latitude: 31.307576157262805, longitude: 75.57061974516645 },
    title: 'Custom Destination',
    description: 'Destination point for the specific offline route generated.'
  },
];
