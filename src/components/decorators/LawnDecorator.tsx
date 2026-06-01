import { ColorDef } from "@itwin/core-common";
import { DecorateContext, Decorator, GraphicType, IModelConnection } from "@itwin/core-frontend";
import { Point3d } from "@itwin/core-geometry";

export class LawnDecorator implements Decorator {
    private _iModel: IModelConnection;

    constructor(iModel: IModelConnection) {
        this._iModel = iModel;
    }

    public decorate(context: DecorateContext): void {
        // 1. Get the bounding box coordinates of your specific house model
        const extents = this._iModel.projectExtents;

        // 2. Expand the boundaries slightly so the lawn extends past the walls
        const padding = 15; // 15 meters of padding around the house
        const minX = extents.low.x - padding;
        const maxX = extents.high.x + padding;
        const minY = extents.low.y - padding;
        const maxY = extents.high.y + padding;
        
        // 3. Set the elevation (Z axis) exactly to the base floor of the house
        const groundZ = extents.low.z - 0.05; 

        // 4. Create the graphic builder
        const builder = context.createGraphicBuilder(GraphicType.WorldDecoration);
        
        // Set outline color to blue, fill color to green, and line width to 10
        builder.setSymbology(ColorDef.blue, ColorDef.green, 10);
        
        // 5. Map out the rectangular coordinates relative to the house
        builder.addShape([
            Point3d.create(minX, minY, groundZ),
            Point3d.create(minX, maxY, groundZ),
            Point3d.create(maxX, maxY, groundZ),
            Point3d.create(maxX, minY, groundZ),
        ]);
        
        // Render the completed shape graphic into the viewport canvas
        context.addDecorationFromBuilder(builder);
        console.log("decorate called");
    }
}
